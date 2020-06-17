/** 
* HBUY_NET
* Base class for an HBUY net module
* Net modules are HBUY's IO layer: a net module subscribes to some
* HTRANS module(s) incoming network data events, determine whether incoming
* data is intended for HBUY, deserializes + validates the data -- and, for
* outbound data, preps and sends it to HTRANS for transmission
*/ 

"use strict";

const EventEmitter = require("events");

class Hbuy_net {
	network;

	constructor() {
		this.network = new EventEmitter();
	}

	_in(msg, rinfo) {
		this.network.emit("message", msg, rinfo);
	}

	_out(msg, rinfo) {
		throw new Error("Subclasses must implement the _out() method");
	}
}

module.exports.Hbuy_net = Hbuy_net;