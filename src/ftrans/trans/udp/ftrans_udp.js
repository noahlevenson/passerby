/** 
* FTRANS_UDP
* UDP transport, implementing a reliable UDP
* protocol, packetization and reassembly, and 
* a fancy network controller with congestion management,
* algorithmic prioritization of inbound messages, etc.
* 
*/ 

"use strict";

const EventEmitter = require("events");
const { Fapp_cfg } = require("../../../fapp/fapp_cfg.js");
const cfg = require("../../../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../../../ftypes/fbigint/fbigint_rn.js") : require("../../../ftypes/fbigint/fbigint_node.js");
const dgram = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("react-native-udp").default : require("dgram");
const { Flog } = require("../../../flog/flog.js");
const { Fbintree } = require("../../../ftypes/fbintree/fbintree.js");
const { Fbintree_node } = require("../../../ftypes/fbintree/fbintree_node.js");
const { Ftrans } = require("../ftrans.js");
const { Ftrans_msg } = require("../../ftrans_msg.js");
const { Ftrans_rinfo } = require("../../ftrans_rinfo.js");
const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");
const { Ftrans_udp_ack } = require("./ftrans_udp_ack.js");
const { Ftrans_udp_recv_buf } = require("./ftrans_udp_recv_buf.js");
const { Ftrans_udp_chunk_sender } = require("./ftrans_udp_chunk_sender.js");
const { Ftrans_udp_socketable } = require("./ftrans_udp_socketable.js");

/**
 * On parameterization:
 * When MAX_OUTBOUND_BYTES_PER_SEC >= OUTBOUND_HZ * SLICE_SZ, the max slices you can send per
 * second is equal to OUTBOUND_HZ. For example: when MAX_OUTBOUND_BYTES_PER_SEC = 131072, 
 * SLICE_SZ = 1024, and OUTBOUND_HZ = 100, you can transmit 102400 bytes (1024 * 100) worth of 
 * slices per second; the remaining overhead will be used to transmit acks. Conversely, setting
 * MAX_OUTBOUND_BYTES_PER_SEC to a value smaller than OUTBOUND_HZ * SLICE_SZ will limit your max
 * slices per second to MAX_OUTBOUND_BYTES_PER_SEC / SLICE_SZ.
 */ 

class Ftrans_udp extends Ftrans {
  static MAX_OUTBOUND_BYTES_PER_SEC = 131072;
  static OUTBOUND_HZ = 100;
  static INBOUND_HZ = 100;

  // Don't mess with these
  static T_SEND_TICK = 1000 / Ftrans_udp.OUTBOUND_HZ;
  static T_RECV_TICK = 1000 / Ftrans_udp.INBOUND_HZ;
  static OUTBOUND_BYTES_PER_MS = Ftrans_udp.MAX_OUTBOUND_BYTES_PER_SEC / 1000;

  // How long do incomplete inbound chunks live til we garbage collect them? Here we assume a 
  // minimum inbound rate of 8k/sec, i.e. we give up on an incomplete 256k chunk after 32 seconds
  static T_INBOUND_TTL = 1000 * (Ftrans_udp_slice.MAX_CHUNK_SZ / 8192);
  static T_GARBAGE_COLLECT = 1000 * 60;

  socket;
  port;
  pubkey;
  udp4;
  udp6;
  chunk_sender;
  chunk_recv_buf;
  recv_queue;
  outbound_budget;
  send_timeout;
  recv_timeout;
  gc_timeout;

  // TODO: UDP6 is disabled by default and we haven't tested IPv6 for a loooooooooong time
  constructor({port = 27500, pubkey = null, udp4 = true, udp6 = false} = {}) {
    super();
    this.chunk_sender = new Ftrans_udp_chunk_sender();
    this.chunk_recv_buf = new Map();
    this.recv_queue = new Fbintree();
    this.port = port;
    this.pubkey = pubkey;
    this.udp4 = udp4;
    this.udp6 = udp6;
    this.outbound_budget = 0;
    this.send_timeout = null;
    this.recv_timeout = null;
    this.gc_timeout = null;
  }

  async _start() {
    if (this.udp4 && this.udp6) {
      this.socket = dgram.createSocket("udp6");
    } else if (this.udp4) {
      this.socket = dgram.createSocket("udp4");
    } else {
      this.socket = dgram.createSocket({type: "udp6", ipv6Only: true});
    }

    this.socket.on("message", this._on_network.bind(this));
    this.socket.bind(this.port);
    
    Flog.log(`[FTRANS] UDP service starting on port ${this.port}, ` +
      `max ${Ftrans_udp.MAX_OUTBOUND_BYTES_PER_SEC / 1024}kbytes/sec outbound`);

    await this._listening();
    this._recv_handler();
    this._send_handler();
    this._gc_handler();
  }

  async _stop() {
    // TODO: Currently we don't clear the send/recv buffers, which may or may not be desirable...
    clearTimeout(this.send_timeout);
    clearTimeout(this.recv_timeout);
    clearTimeout(this.gc_timeout);
    this.send_timeout = null;
    this.recv_timeout = null;
    this.gc_timeout = null;
    this.outbound_budget = 0;
    Flog.log(`[FTRANS] Stopping UDP service...`);
    this.socket.close();
    await this._closed();
  }

  _closed() {
    return new Promise((resolve, reject) => {
      this.socket.on("close", () => {
        Flog.log(`[FTRANS] UDP service stopped`);
        resolve();
      });
    });
  }

  _listening() {
    return new Promise((resolve, reject) => {
      this.socket.on("listening", () => {
        const addr = this.socket.address();
        Flog.log(`[FTRANS] UDP service online, listening on ${addr.address}:${addr.port}`);
        resolve();
      });
    });
  }

  _gc_handler() {
    this.gc_timeout = setTimeout(() => {
      const t_expiry = Date.now() - Ftrans_udp.T_INBOUND_TTL;
      let stale = 0;

      Array.from(this.chunk_recv_buf.entries()).forEach((pair) => {
        if (pair[1].at < t_expiry) {
          this.chunk_recv_buf.delete(pair[0]);
          stale += 1;
        }
      });

      Flog.log(`[FTRANS] Net stat: ${stale} stale chunks, ${this.chunk_sender.size()} outbound slices`);

      this._gc_handler();
    }, Ftrans_udp.T_GARBAGE_COLLECT);
  }

  _recv_handler() {
    this.recv_timeout = setTimeout(async () => {
      const node = this.recv_queue.bst_min();

      if (node !== null) {
        const [reassembled, rinfo] = node.data;
        this.recv_queue.bst_delete(node);

        const in_msg = new Ftrans_msg(JSON.parse(reassembled.toString(), Fbigint._json_revive));
        const decrypted_msg = await Ftrans_msg.decrypted_from(in_msg);

        if (decrypted_msg !== null) {
          this.network.emit("message", decrypted_msg, new Ftrans_rinfo({
            address: rinfo.address, 
            port: rinfo.port, 
            family: rinfo.family, 
            pubkey: decrypted_msg.pubkey
          }));
        }
      }

      this._recv_handler();
    }, Ftrans_udp.T_RECV_TICK);
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
        dt * Ftrans_udp.OUTBOUND_BYTES_PER_MS + this.outbound_budget, 
        Ftrans_udp.MAX_OUTBOUND_BYTES_PER_SEC
      );

      if (this.outbound_budget > Ftrans_udp_slice.SLICE_SZ) {
        const socketable = this.chunk_sender.next();

        if (socketable !== null) {
          this._to_socket(socketable);
        }
      }

      this._send_handler(Date.now());
    }, Ftrans_udp.T_SEND_TICK);
  }

  async _on_network(msg, rinfo) {
    // msg is a slice, an ack, or some garbage we shouldn't have been sent
    // TODO: is_valid_slice and is_valid_ack may error when used on the opposite msg type
    try {
      if (Ftrans_udp_slice.is_valid_slice(msg)) {
        const chunk_id = Ftrans_udp_slice.get_chunk_id(msg);
        const nslices = Ftrans_udp_slice.get_nslices(msg);
        const checksum = Ftrans_udp_slice.get_checksum(msg);
        const chunk_key = `${rinfo.address}:${rinfo.port}:${chunk_id},${nslices}`;
        let r_buf = this.chunk_recv_buf.get(chunk_key);

        /**
         * If we don't yet have a recv buffer for this chunk, or if there's an existing incomplete
         * chunk in progress with a different checksum, create a new recv buffer for this chunk.
         * TODO: if we include the checksum in chunk_key, we don't need this Buffer comparison...
         * compare two 4-byte Buffers vs. stringify one 4-byte Buffer, what's the megachad optimization?
         */ 
        if (!r_buf || Buffer.compare(r_buf.checksum, checksum) !== 0) {
          r_buf = new Ftrans_udp_recv_buf({chunk_id: chunk_id, nslices: nslices, checksum: checksum});
          this.chunk_recv_buf.set(chunk_key, r_buf);
        }

        r_buf.add(msg);

        // Send an ack immediately; in the worst case, we briefly exceed our data budget by ACK_SZ
        this._to_socket(new Ftrans_udp_socketable({
          buf: Ftrans_udp_ack.new({chunk_id: chunk_id, nslices: nslices, acked: r_buf.get_acked()}), 
          address: rinfo.address, 
          port: rinfo.port
        }));

        if (r_buf.is_complete()) {
          const reassembled = r_buf.reassemble_unsafe();
          this.chunk_recv_buf.delete(chunk_key);

          /**
           * Deserialization and decryption are expensive, so we defer that stuff to _recv_handler...
           * This BST comparator function encapsulates v0.0 of our inbound prioritization logic:
           * just prioritize small messages over large messages. This is based on the idea that peers
           * should always ensure an orderly flow of administrative messages by deferring the 
           * processing of large chunks of inbound data to periods of downtime.
           */
          this.recv_queue.bst_insert(new Fbintree_node({data: [reassembled, rinfo]}), (node, oldnode) => {
            if (node.data[0].length < oldnode.data[0].length) {
              return -1
            }

            if (node.data[0].length > oldnode.data[0].length) {
              return 1;
            }

            return 0;
          });
        }
      } else if (Ftrans_udp_ack.is_valid_ack(msg)) {
        this.chunk_sender.set_acked({
          chunk_id: Ftrans_udp_ack.get_chunk_id(msg), 
          acked: Ftrans_udp_ack.get_acked(msg),
          rinfo: rinfo
        });
      }
    } catch(err) {
      // Do nothing
    }
  }

  _to_socket(socketable) {
    this.socket.send(
      socketable.buf, 
      0, 
      socketable.buf.length, 
      socketable.port, 
      socketable.address, 
      (err) => {
        if (err) {
          Flog.log(`[FTRANS] UDP send error ${socketable.address}:${socketable.port} (${err})`);
        }
      }
    );

    this.outbound_budget -= socketable.buf.length;
  }

  async _send(msg, msg_type, ftrans_rinfo) {
    const ftrans_msg = await Ftrans_msg.encrypted_from({
      msg: msg, 
      type: msg_type,
      sender_pubkey: this.pubkey, 
      recip_pubkey: ftrans_rinfo.pubkey
    });

    this.chunk_sender.add({chunk: Buffer.from(JSON.stringify(ftrans_msg)), rinfo: ftrans_rinfo});
  }
}

module.exports.Ftrans_udp = Ftrans_udp;