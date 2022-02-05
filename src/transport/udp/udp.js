"use strict";

const EventEmitter = require("events");
const dgram = require("dgram");
const Journal = require("../../core/journal.js");
const Slice = require("./slice.js");
const Ack = require("./ack.js");
const { Transport } = require("../transport.js");
const { Bintree, Bintree_node } = require("../../core/types/bintree.js");
const { Chunk_sender, Chunk_receiver } = require("./chunk.js");

/**
 * On parameterization:
 * When MAX_OUTBOUND_BYTES_PER_SEC >= OUTBOUND_HZ * SLICE_SZ, the max slices you can send per
 * second is equal to OUTBOUND_HZ. For example: when MAX_OUTBOUND_BYTES_PER_SEC = 131072, 
 * SLICE_SZ = 1024, and OUTBOUND_HZ = 100, you can transmit 102400 bytes (1024 * 100) worth of 
 * slices per second; the remaining overhead will be used to transmit acks. Conversely, setting
 * MAX_OUTBOUND_BYTES_PER_SEC to a value smaller than OUTBOUND_HZ * SLICE_SZ will limit your max
 * slices per second to MAX_OUTBOUND_BYTES_PER_SEC / SLICE_SZ.
 */ 

class Udp extends Transport {
  static MAX_OUTBOUND_BYTES_PER_SEC = 131072;
  static OUTBOUND_HZ = 100;
  static INBOUND_HZ = 100;

  /**
   * Don't mess with these
   */ 
  static T_SEND_TICK = 1000 / Udp.OUTBOUND_HZ;
  static T_RECV_TICK = 1000 / Udp.INBOUND_HZ;
  static OUTBOUND_BYTES_PER_MS = Udp.MAX_OUTBOUND_BYTES_PER_SEC / 1000;

  /**
   * How long do incomplete inbound chunks live til we garbage collect them? Here we assume a 
   * minimum inbound rate of 8k/sec, i.e. we give up on an incomplete 256k chunk after 32 seconds
   */ 
  static T_INBOUND_TTL = 1000 * (Slice.MAX_CHUNK_SZ / 8192);
  static T_GARBAGE_COLLECT = 1000 * 60;

  /**
   * TODO: UDP6 is disabled by default and we haven't tested IPv6 for a loooooooooong time
   */ 
  constructor({port = 27500, udp4 = true, udp6 = false} = {}) {
    super();
    this.chunk_sender = new Chunk_sender();
    this.chunk_receiver = new Chunk_receiver();
    this.recv_queue = new Bintree();
    this.port = port;
    this.udp4 = udp4;
    this.udp6 = udp6;
    this.outbound_budget = 0;
    this.send_timeout = null;
    this.recv_timeout = null;
    this.gc_timeout = null;
  }

  async start() {
    if (this.udp4 && this.udp6) {
      this.socket = dgram.createSocket("udp6");
    } else if (this.udp4) {
      this.socket = dgram.createSocket("udp4");
    } else {
      this.socket = dgram.createSocket({type: "udp6", ipv6Only: true});
    }

    this.socket.on("message", this._on_network.bind(this));
    this.socket.bind(this.port);
    
    Journal.log(Transport.TAG, `UDP service starting on port ${this.port}, ` +
      `max ${Udp.MAX_OUTBOUND_BYTES_PER_SEC / 1024}kbytes/sec outbound`);

    await this._listening();
    this._recv_handler();
    this._send_handler();
    this._gc_handler();
  }

  async stop() {
    // TODO: Currently we don't clear the send/recv buffers, which may or may not be desirable...
    this.socket.removeListener("message", this._on_network.bind(this));
    clearTimeout(this.send_timeout);
    clearTimeout(this.recv_timeout);
    clearTimeout(this.gc_timeout);
    this.send_timeout = null;
    this.recv_timeout = null;
    this.gc_timeout = null;
    this.outbound_budget = 0;
    Journal.log(Transport.TAG, `Stopping UDP service...`);
    this.socket.close();
    await this._closed();
  }

  _closed() {
    return new Promise((resolve, reject) => {
      this.socket.on("close", () => {
        Journal.log(Transport.TAG, `UDP service stopped`);
        resolve();
      });
    });
  }

  _listening() {
    return new Promise((resolve, reject) => {
      this.socket.on("listening", () => {
        const addr = this.socket.address();
        Journal.log(Transport.TAG, `UDP service online, listening on ${addr.address}:${addr.port}`);
        resolve();
      });
    });
  }

  _gc_handler() {
    this.gc_timeout = setTimeout(() => {
      const n_stale = this.chunk_receiver.gc(Date.now() - Udp.T_INBOUND_TTL);
      Journal.log(Transport.TAG, `Net stat: ${n_stale} stale chunks, ` + 
        `${this.chunk_sender.size()} outbound slices`);
      this._gc_handler();
    }, Udp.T_GARBAGE_COLLECT);
  }

  _recv_handler() {
    this.recv_timeout = setTimeout(async () => {
      const node = this.recv_queue.bst_min();

      if (node !== null) {
        const [reassembled, rinfo] = node.get_data();
        this.recv_queue.bst_delete(node);
        this.recv.emit("message", reassembled, rinfo);
      }

      this._recv_handler();
    }, Udp.T_RECV_TICK);
  }

  /**
   * You might recognize that we imprecisely estimate our budget overhead based on the maximum 
   * slice size, so some ticks will let overhead go unused. It's also notable that our acks, which 
   * are much smaller packets, are not serialized through this controller, but ARE factored into 
   * our outbound data budget. 
   */
  _send_handler(t1 = 0) {
    this.send_timeout = setTimeout(() => {
      const dt = Date.now() - t1;
      this.chunk_sender.tick();

      this.outbound_budget = Math.min(
        dt * Udp.OUTBOUND_BYTES_PER_MS + this.outbound_budget, 
        Udp.MAX_OUTBOUND_BYTES_PER_SEC
      );

      if (this.outbound_budget > Slice.SLICE_SZ) {
        const send_state = this.chunk_sender.next();

        if (send_state !== null) {
          this._to_socket(send_state.slice, send_state.rinfo.address, send_state.rinfo.port);
        }
      }

      this._send_handler(Date.now());
    }, Udp.T_SEND_TICK);
  }

  async _on_network(msg, rinfo) {
    try {
      /**
       * msg is a Buffer delivered from the socket, so we coerce into a Uint8Array for compatibility.
       * TODO: is_valid_slice and is_valid_ack may error when used on the opposite type
       */
       msg = new Uint8Array(msg);

      if (Slice.is_valid_slice(msg)) {
        const [acked, reassembled] = this.chunk_receiver.add({slice: msg, rinfo: rinfo});

        // Send an ack immediately; in the worst case, we briefly exceed our data budget by ACK_SZ
        this._to_socket(
          Ack.new_ack({chunk_id: Slice.get_chunk_id(msg), nslices: Slice.get_nslices(msg), acked: acked}),
          rinfo.address,
          rinfo.port
        );

        /**
         * TODO: We currently implement inbound message prioritization, and the logic is here in
         * this BST comparator function: Just prioritize small messages over large ones. This is 
         * based on the idea that peers should always ensure an orderly flow of administrative 
         * messages by deferring the processing of large chunks of data to periods of downtime. It 
         * happens to be pretty effective at keeping the UI fluid on mobile devices, but we might 
         * consider making this prioritization comparator parameterizable, or implementing message 
         * priority in the message header instead of doing it algorithmically...
         */ 
        if (reassembled !== null) {
          this.recv_queue.bst_insert(new Bintree_node({data: [reassembled, rinfo]}), (node, oldnode) => {
            if (node.get_data()[0].length < oldnode.get_data()[0].length) {
              return -1
            }

            if (node.get_data()[0].length > oldnode.get_data()[0].length) {
              return 1;
            }

            return 0;
          });
        }
      } else if (Ack.is_valid_ack(msg)) {
        this.chunk_sender.set_acked({
          chunk_id: Ack.get_chunk_id(msg), 
          acked: Ack.get_acked(msg),
          rinfo: rinfo
        });
      }
    } catch(err) {
      // Do nothing
    }
  }

  _to_socket(buf, address, port) {
    this.socket.send(
      buf, 
      0, 
      buf.length, 
      port, 
      address, 
      (err) => {
        if (err) {
          Journal.log(Transport.TAG, `UDP send error ${address}:${port} (${err})`);
        }
      }
    );

    this.outbound_budget -= buf.length;
  }

  // msg as Uint8Array
  _send(msg, rinfo, msg_timeout) {
    this.chunk_sender.add({
      chunk: msg,
      rinfo: rinfo,
      msg_timeout: msg_timeout
    });
  }
}

module.exports = { Udp };