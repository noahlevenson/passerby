/** 
* FTRANS_UDP
* UDP transport
* 
* 
* 
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
const { Ftrans } = require("../ftrans.js");
const { Ftrans_msg } = require("../../ftrans_msg.js");
const { Ftrans_rinfo } = require("../../ftrans_rinfo.js");
const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");
const { Ftrans_udp_slice_send_buf } = require("./ftrans_udp_slice_send_buf.js");
const { Ftrans_udp_slice_recv_buf } = require("./ftrans_udp_slice_recv_buf.js");

/*
* Some thoughts about parameterization:
* At a max outbound rate of 262144 and a slice size of 512 bytes, we can send 512 slices per second.
* Of course, outbound Bps is also bound by tick rate: at 250 Hz and a slice size of 512, you're
* only going to send 128,000 bytes/sec. Consider your effective outbound rate wrt the chunk buffer:
* If MAX_CHUNKS is 65536 (max 16-bit uint), our tick rate is 250 Hz, our slice size is 512, and our 
* max outbound rate is greater than our effective outbound rate of 128,000 bytes/sec, then in the 
* the worst case, where all of our chunks consist of just one slice, we're bound by tick rate; we 
* can effectively transmit 250 chunks per second, meaning we'll wrap around the chunk buffer in ~262 
* seconds (65536 / 250 = 262.144). If we're unhappy with this, and we find that most of our chunks
* are about 256 bytes, then changing our slice size to 128 would make us bound by slice size; each
* chunk would, on average, consist of two slices, our effective outbound rate would be 
* 32,000 bytes/sec, and chunks will require two ticks to transmit, meaning we'll wrap the chunk 
* buffer in ~524 seconds (65536 / (250 / 2) = 524.288).
*/

class Ftrans_udp extends Ftrans {
  static MAX_OUTBOUND_PER_SEC = 262144;
  static OUTBOUND_HZ = 250;
  static T_TICK = 1000 / Ftrans_udp.OUTBOUND_HZ;
  static OUTBOUND_TICK_BUDGET = Ftrans_udp.MAX_OUTBOUND_PER_SEC / Ftrans_udp.OUTBOUND_HZ;
  static MAX_RETRIES = 0;
  // How long do incomplete inbound chunks live til we garbage collect them? Here we assume a 
  // minimum inbound rate of 8k/sec, i.e. we give up on an incomplete 256k chunk after 32 seconds
  static T_INBOUND_TTL = 1000 * (Ftrans_udp_slice.MAX_CHUNK_SZ / 8192);
  static T_GARBAGE_COLLECT = 1000 * 60;

  socket;
  port;
  pubkey;
  udp4;
  udp6;
  chunk_send_buf;
  chunk_recv_buf;
  rd_ptr;
  wr_ptr;
  outbound_budget;
  send_timeout;
  gc_timeout;

  // TODO: UDP6 is disabled by default and we haven't tested IPv6 for a loooooooooong time
  constructor({port = 27500, pubkey = null, udp4 = true, udp6 = false} = {}) {
    super();

    this.chunk_send_buf = new Map(new Array(Ftrans_udp_slice.MAX_CHUNKS).fill().map((elem, i) => {
      return [i, null];
    }));

    this.chunk_recv_buf = new Map();
    this.port = port;
    this.pubkey = pubkey;
    this.udp4 = udp4;
    this.udp6 = udp6;
    this.rd_ptr = 0;
    this.wr_ptr = 0;
    this.outbound_budget = 0;;
    this.send_timeout = null;
    this.gc_timeout = null;
  }

  _get_outbound_rate() {
    return Ftrans_udp.MAX_OUTBOUND_PER_SEC - this.outbound_budget;
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
    this._send_handler();
    this._gc_handler();
  }

  _stop() {
    this.socket.on("close", () => {
      Flog.log(`[FTRANS] UDP service stopped`);
    });

    // TODO: Currently we don't clear the send/recv buffers, which may or may not be desirable...
    clearTimeout(this.send_timeout);
    clearTimeout(this.gc_timeout);
    this.send_timeout = null;
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

  // Runs once every T_TICK ms, transmitting the next eligible slice in the send buffer or 
  // preventing transmission for one tick for network congestion
  _send_handler() {
    this.send_timeout = setTimeout(() => {
      if (this.outbound_budget > 0) {
        let chunk_reads = 0;

        while (chunk_reads < Ftrans_udp_slice.MAX_CHUNKS) {
          const s_buf = this.chunk_send_buf.get(this.rd_ptr);

          // Case 1: we haven't written a chunk to this index yet, occurs only during early network
          // TODO: eliminate this case by improving the way we init the chunk send buffer
          if (s_buf === null) {
            this._incr_rd_ptr();
            chunk_reads += 1;
            continue;
          }

          const s = s_buf.next();

          // Case 2: We've reached the end of this chunk
          if (s === null) {
            s_buf.reset();
            this._incr_rd_ptr();
            continue;
          }

          // Case 3: We've got a slice we can send
          if (!s.acked && s.tries <= Ftrans_udp.MAX_RETRIES) {
            this.socket.send(s.slice, 0, s.slice.length, s_buf.rinfo.port, s_buf.rinfo.address, (err) => {
              if (err) {
                Flog.log(`[FTRANS] UDP send error ${s_buf.rinfo.addr}:${s_buf.rinfo.port} (${err})`);
              }
            });

            s.tries += 1;
            this.outbound_budget -= s.slice.length;
            break;
          }
        }
      }

      this.outbound_budget = Math.min(
        this.outbound_budget + Ftrans_udp.OUTBOUND_TICK_BUDGET, 
        Ftrans_udp.MAX_OUTBOUND_PER_SEC
      );

      this._send_handler();
    }, Ftrans_udp.T_TICK);
  }

  async _on_network(msg, rinfo) {
    // msg is a slice, an ack, or some garbage we shouldn't have been sent
    // TODO: is_valid_slice and is_valid_ack may error when used on the opposite msg type

    try {
      if (Ftrans_udp_slice.is_valid_slice(msg)) {
        const chunk_id = Ftrans_udp_slice.get_chunk_id(msg);
        const nslices = Ftrans_udp_slice.get_nslices(msg);
        const chunk_key = `${rinfo.address}:${rinfo.port}:${chunk_id},${nslices}`;
        let r_buf = this.chunk_recv_buf.get(chunk_key);

        if (!r_buf) {
          r_buf = new Ftrans_udp_slice_recv_buf({chunk_id: chunk_id, nslices: nslices});
          this.chunk_recv_buf.set(chunk_key, r_buf);
        }

        r_buf.add(msg);

        if (r_buf.is_complete()) {
          const reassembled = r_buf.reassemble_unsafe();
          this.chunk_recv_buf.delete(chunk_key);

          // Rehydrate and decrypt the message, pass to the next layer
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
    
    this.chunk_send_buf.set(this.wr_ptr, new Ftrans_udp_slice_send_buf({
      chunk: Buffer.from(JSON.stringify(ftrans_msg)),
      chunk_id: this.wr_ptr,
      rinfo: ftrans_rinfo
    }));

    this._incr_wr_ptr();
  }

  _incr_wr_ptr() {
    this.wr_ptr = this.wr_ptr < Ftrans_udp_slice.MAX_CHUNKS - 1 ? 
      this.wr_ptr + 1 : 0;
  }

  _incr_rd_ptr() {
    this.rd_ptr = this.rd_ptr < Ftrans_udp_slice.MAX_CHUNKS - 1 ? 
      this.rd_ptr + 1 : 0;
  }
}

module.exports.Ftrans_udp = Ftrans_udp;