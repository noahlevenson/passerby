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
const { Fapp_cfg } = require("../../fapp/fapp_cfg.js");
const cfg = require("../../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../../ftypes/fbigint/fbigint_rn.js") : require("../../ftypes/fbigint/fbigint_node.js");
const dgram = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("react-native-udp").default : require("dgram");
const { Fid } = require("../../fid/fid.js"); 
const { Flog } = require("../../flog/flog.js");
const { Ftrans } = require("./ftrans.js");
const { Ftrans_msg } = require("../ftrans_msg.js");
const { Ftrans_rinfo } = require("../ftrans_rinfo.js");
const { Futil } = require("../../futil/futil.js");


class Ftrans_udp extends Ftrans {
  static RETRANSMIT = true;
  static MAX_RETRIES = 7;
  static DEFAULT_RTT_MS = 200;
  static BACKOFF_FUNC = x => x * 2;

  socket;
  port;
  pubkey;
  udp4;
  udp6;
  ack;

  // TODO: UDP6 is disabled by default and we haven't tested IPv6 for a loooooooooong time
  constructor({port = 27500, pubkey = null, udp4 = true, udp6 = false} = {}) {
    super();
    this.port = port;
    this.pubkey = pubkey;
    this.udp4 = udp4;
    this.udp6 = udp6;
    this.ack = new EventEmitter();
  }

  async _start() {
    if (this.udp4 && this.udp6) {
      this.socket = dgram.createSocket("udp6");
    } else if (this.udp4) {
      this.socket = dgram.createSocket("udp4");
    } else {
      this.socket = dgram.createSocket({type: "udp6", ipv6Only: true});
    }

    this.socket.on("message", this._on_message.bind(this));
    this.socket.bind(this.port);
    
    Flog.log(`[FTRANS] UDP service starting on port ${this.port}, ` + 
      `retransmission ${Ftrans_udp.RETRANSMIT ? "enabled" : "disabled"}...`);

    await this._listening();
  }

  _stop() {
    this.socket.on("close", () => {
      Flog.log(`[FTRANS] UDP service stopped`);
    });

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

  async _on_message(msg, rinfo) {
    // TODO: msg is a Buffer representing a stringified Ftrans_msg
    // TODO: Validation!
    const in_msg = new Ftrans_msg(JSON.parse(msg.toString(), Fbigint._json_revive));

    // TODO: since we handle the ACK before decrypting the message, we'll inadvertently send
    // ACK replies for messages from adversaries... we must be more alpha than that

    // We're in retransmit mode and the incoming msg is an ACK, so just announce the ACK and be done
    if (Ftrans_udp.RETRANSMIT && in_msg.type === Ftrans_msg.TYPE.ACK) {
      this.ack.emit(in_msg.id.toString(), in_msg);
      return;
    }

    // We're in retransmit mode and someone sent us a non-ACK msg, so we short circuit the _send
    // method to send an ACK reply without retransmitting it
    if (Ftrans_udp.RETRANSMIT) {
      const ack = new Ftrans_msg({
        type: Ftrans_msg.TYPE.ACK,
        id: in_msg.id
      });

      this._do_send(Buffer.from(JSON.stringify(ack)), rinfo.address, rinfo.port);
    }

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

  _do_send(buf, addr, port, cb = () => {}) {
    this.socket.send(buf, 0, buf.length, port, addr, (err) => {
      if (err) {
        Flog.log(`[FTRANS] UDP socket send error ${addr}:${port} (${err})`);
        return;
      }

      cb();
    });
  }

  async _send(msg, ftrans_rinfo) {
    const ftrans_msg = await Ftrans_msg.encrypted_from({
      msg: msg, 
      sender_pubkey: this.pubkey, 
      recip_pubkey: ftrans_rinfo.pubkey
    });
    
    // Add an ID if we're in retransmit mode
    if (Ftrans_udp.RETRANSMIT) {
      ftrans_msg.id = Fbigint.unsafe_random(Ftrans_msg.ID_LEN);
    }

    const buf = Buffer.from(JSON.stringify(ftrans_msg));

    this._do_send(buf, ftrans_rinfo.address, ftrans_rinfo.port, () => {
      let timeout_id = null;

      function _retry_runner(f, i, max_retries, delay, backoff_f, end_cb) {
        if (i === max_retries) {
          end_cb();
          
          Flog.log(`[FTRANS] Retransmitted msg # ${ftrans_msg.id.toString()} ` + 
            `${max_retries} times, giving up!`);

          return;
        }

        timeout_id = setTimeout(() => {
          Flog.log(`[FTRANS] No UDP ACK for msg # ${ftrans_msg.id}, ` + 
            `retransmitting ${i + 1}/${max_retries}`);

          f();
          _retry_runner(f, i + 1, max_retries, backoff_f(delay), backoff_f, end_cb);
        }, delay);
      }

      if (Ftrans_udp.RETRANSMIT) {
        this.ack.once(ftrans_msg.id.toString(), (res_msg) => {
          clearTimeout(timeout_id);
        });

        _retry_runner(this._do_send.bind(
          this, 
          buf, 
          ftrans_rinfo.address, 
          ftrans_rinfo.port
        ), 0, Ftrans_udp.MAX_RETRIES, Ftrans_udp.DEFAULT_RTT_MS, Ftrans_udp.BACKOFF_FUNC, () => {
          this.ack.removeAllListeners(ftrans_msg.id.toString());
        });
      }
    });
  }
}

module.exports.Ftrans_udp = Ftrans_udp;