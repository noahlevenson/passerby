/** 
* FDLT_NET
* Base class for an FDLT net module
* Net modules are FDLT's IO layer: a net module subscribes to some
* FTRANS module(s) incoming network data events, determine whether incoming
* data is intended for FDLT, deserializes & validates the data -- and, for
* outbound data, preps and sends it to FTRANS for transmission
*/ 

"use strict";

const EventEmitter = require("events");

class Fdlt_net {
  network;

  constructor(app_id) {
    this.network = new EventEmitter();
  }

  _in(msg, rinfo) {
    this.network.emit("message", msg, rinfo);
  }

  _out(msg, rinfo) {
    throw new Error("Subclasses must implement the _out() method");
  }
}

module.exports.Fdlt_net = Fdlt_net;