/** 
* FDLT_NET_SOLO
* An FDLT net module that subscribes to exactly one FTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Fdlt_net } = require("./fdlt_net.js");
const { Fdlt_msg } = require("../fdlt_msg.js");
const { Ftrans_msg } = require("../../ftrans/ftrans_msg.js");
const { Ftrans } = require("../../ftrans/trans/ftrans.js");

class Fdlt_net_solo extends Fdlt_net {
  trans;
  app_id;

  /**
   * TODO: app_id should prob become part of the Fdlt_net base class
   */ 

  constructor(trans, app_id) {
    super();

    if (!(trans instanceof Ftrans)) {
      throw new TypeError("Argument 'trans' must be instance of Ftrans");
    }

    if (typeof app_id !== "string") {
      throw new Error("You must provide an app_id");
    }

    this.trans = trans;
    this.trans.network.on("message", this._on_message.bind(this));
    this.app_id = app_id;
  }

  _on_message(ftrans_msg, rinfo) {
    try {
      if (ftrans_msg.type === Ftrans_msg.TYPE.FDLT && ftrans_msg.msg.app_id === this.app_id) {
        const msg = new Fdlt_msg(ftrans_msg.msg);
        this._in(msg, rinfo);
      }
    } catch(err) {
      // Do nothing
    }
  }

  _out(fdlt_msg, rinfo) {
    this.trans._send(fdlt_msg, Ftrans_msg.TYPE.FDLT, rinfo);
  }
}

module.exports.Fdlt_net_solo = Fdlt_net_solo;