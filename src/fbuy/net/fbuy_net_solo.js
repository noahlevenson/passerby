/** 
* FBUY_NET_SOLO
* An FBUY net module that subscribes to exactly one FTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Fbuy_net } = require("./fbuy_net.js");
const { Fbuy_msg } = require("../fbuy_msg.js");
const { Ftrans_msg } = require("../../ftrans/ftrans_msg.js");
const { Ftrans } = require("../../ftrans/trans/ftrans.js");

class Fbuy_net_solo extends Fbuy_net {
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
      if (ftrans_msg.type === Ftrans_msg.TYPE.FBUY) {
        const msg = new Fbuy_msg(ftrans_msg.msg);
        this._in(msg, rinfo);
      }
    } catch(err) {
      // Do nothing
    }
  }

  _out(fbuy_msg, rinfo) {
    this.trans._send(fbuy_msg, Ftrans_msg.TYPE.FBUY, rinfo);
  }
}

module.exports.Fbuy_net_solo = Fbuy_net_solo;