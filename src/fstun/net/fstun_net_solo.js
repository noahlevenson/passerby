/** 
* FSTUN_NET_SOLO
* An FSTUN net module that subscribes to exactly one FTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Fstun_net } = require("./fstun_net.js");
const { Ftrans } = require("../../ftrans/trans/ftrans.js");
const { Ftrans_msg } = require("../../ftrans/ftrans_msg.js");

class Fstun_net_solo extends Fstun_net {
  trans;

  constructor(trans) {
    super();

    if (!(trans instanceof Ftrans)) {
      throw new TypeError("Argument 'trans' must be instance of Ftrans");
    }

    this.trans = trans;
    this.trans.network.on("message", this._on_message.bind(this));
  }

  _on_message(ftrans_msg, rinfo) {
    try {
      if (ftrans_msg.type === Ftrans_msg.TYPE.FSTUN) {
        this._in(Buffer.from(ftrans_msg.msg), rinfo);
      }
    } catch(err) {
      // Silently ignore it?
    }
  }

  _out(msg, rinfo) {
    this.trans._send(msg, rinfo);
  }
}

module.exports.Fstun_net_solo = Fstun_net_solo;