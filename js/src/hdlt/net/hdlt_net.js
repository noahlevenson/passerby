/** 
* HDLT_NET
* Base class for an HDLT net module
* Net modules are HDLT's IO layer: a net module subscribes to some
* HTRANS module(s) incoming network data events, determine whether incoming
* data is intended for HDLT, deserializes + validates the data -- and, for
* outbound data, preps and sends it to HTRANS for transmission
*/ 

"use strict";

const EventEmitter = require("events");

class Hdlt_net {
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

module.exports.Hdlt_net = Hdlt_net;