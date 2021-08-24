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
const { Ftrans_udp_ack_sender } = require("./ftrans_udp_ack_sender.js");
const { Ftrans_udp_chunk_sender } = require("./ftrans_udp_chunk_sender.js");

/**
 * Thoughts about parameterization:
 * Each tick, the network controller will try to send as much data as it can while respecting 
 * the outbound tick budget. The result: slower tick rates, by budgeting more data per tick, give
 * you a higher burst rate at the expense of less consistent execution time -- while faster tick
 * rates, by reducing how many packets can be sent per tick, give you a lower burst rate but keep
 * the send handler's computational complexity relatively consistent across invocations. This stuff
 * matters on resource constrained mobile devices. Always consider your outbound tick budget wrt 
 * your slice size; you probably want to be able to send at least one slice per tick. Another 
 * consideration is how often you'll wrap the outbound chunk buffer: with a max outbound rate of 
 * 256kbytes, a slice size of 1024 bytes, and a tick rate of 250 Hz, you can send 1 slice per tick 
 * (the tick budget is ~1048 bytes). Given these parameters, in the worst case where each chunk 
 * consists of only one slice, you'll wrap the chunk buffer in ~262 seconds (65536 / 250 = 262.144).
 */

class Ftrans_udp extends Ftrans {
  // Max outbound is in bytes, not bits
  static MAX_OUTBOUND_PER_SEC = 262144;
  static OUTBOUND_HZ = 250;
  static INBOUND_HZ = 100;
  static T_SEND_TICK = 1000 / Ftrans_udp.OUTBOUND_HZ;
  static T_RECV_TICK = 1000 / Ftrans_udp.INBOUND_HZ;
  static OUTBOUND_TICK_BUDGET = Ftrans_udp.MAX_OUTBOUND_PER_SEC / Ftrans_udp.OUTBOUND_HZ;
  // How long do incomplete inbound chunks live til we garbage collect them? Here we assume a 
  // minimum inbound rate of 8k/sec, i.e. we give up on an incomplete 256k chunk after 32 seconds
  static T_INBOUND_TTL = 1000 * (Ftrans_udp_slice.MAX_CHUNK_SZ / 8192);
  static T_GARBAGE_COLLECT = 1000 * 60;

  socket;
  port;
  pubkey;
  udp4;
  udp6;
  ack_sender;
  chunk_sender;
  sender_map;
  chunk_recv_buf;
  recv_queue;
  outbound_budget;
  send_timeout;
  recv_timeout;
  gc_timeout;

  // TODO: UDP6 is disabled by default and we haven't tested IPv6 for a loooooooooong time
  constructor({port = 27500, pubkey = null, udp4 = true, udp6 = false} = {}) {
    super();
    this.ack_sender = new Ftrans_udp_ack_sender();
    this.chunk_sender = new Ftrans_udp_chunk_sender();
    this.sender_map = new Map([[true, this.ack_sender], [false, this.chunk_sender]]);
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
      `max ${Ftrans_udp.MAX_OUTBOUND_PER_SEC / 1024}k/sec outbound`);

    await this._listening();
    this._recv_handler();
    this._send_handler();
    this._gc_handler();
  }

  _stop() {
    this.socket.on("close", () => {
      Flog.log(`[FTRANS] UDP service stopped`);
    });

    // TODO: Currently we don't clear the send/recv buffers, which may or may not be desirable...
    clearTimeout(this.send_timeout);
    clearTimeout(this.recv_timeout);
    clearTimeout(this.gc_timeout);
    this.send_timeout = null;
    this.recv_timeout = null;
    this.gc_timeout = null;
    this.outbound_budget = 0;
    this.socket.close();
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

      Flog.log(`[FTRANS] UDP network controller: deleted ${stale} stale chunks`);

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

  // TODO: this can be designed better... here's why it's excessively complex: each iteration of
  // the while loop, we don't know how much we've spent until after we've already sent it, which
  // means that we could be sending way more data than we've budgeted per tick! To compensate, 
  // we let outbound_budget go negative and pause transmission if we overspent in the previous tick.
  // A smarter design would invert this: check the bytes required to send each packet before popping
  // it off the queue, and exit the loop if we would exceed our budget by sending it.
  _send_handler() {
    this.send_timeout = setTimeout(() => {
      if (this.outbound_budget > 0) {
        let spent = 0;
        let prioritize_ack = true;
    
        while (spent < Ftrans_udp.OUTBOUND_TICK_BUDGET && 
          !(this.chunk_sender.length() === 0 && this.ack_sender.length() === 0)) {
          let socketable;

          if (this.chunk_sender.length() === 0) {
            socketable = this.ack_sender.next();
          } else if (this.ack_sender.length() === 0) {
            socketable = this.chunk_sender.next();
          } else {
            socketable = this.sender_map.get(prioritize_ack).next();
            prioritize_ack = !prioritize_ack;
          }

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

          spent += socketable.buf.length;
        }

        this.outbound_budget -= spent;
      }

      this.outbound_budget = Math.min(
        this.outbound_budget + Ftrans_udp.OUTBOUND_TICK_BUDGET, 
        Ftrans_udp.MAX_OUTBOUND_PER_SEC
      );

      this._send_handler();
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

        // If we don't yet have a recv buffer for this chunk, or if there's an existing incomplete
        // chunk in progress but with a different checksum, create a new recv buffer for this chunk
        // TODO: if we include checksum in chunk_key, we don't need this Buffer compare... compare
        // 2 4-byte Buffers vs stringify 1 4-byte Buffer, what's the megachad micro optimization here?
        if (!r_buf || Buffer.compare(r_buf.checksum, checksum) !== 0) {
          r_buf = new Ftrans_udp_recv_buf({chunk_id: chunk_id, nslices: nslices, checksum: checksum});
          this.chunk_recv_buf.set(chunk_key, r_buf);
        }

        r_buf.add(msg);

        const ack = Ftrans_udp_ack.new({
          chunk_id: chunk_id,
          nslices: nslices,
          acked: r_buf.get_acked()
        });       
        
        this.ack_sender.add({ack: ack, rinfo: rinfo});
    
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
          acked: Ftrans_udp_ack.get_acked(msg)
        });
      }
    } catch(err) {
      // Do nothing
    }
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