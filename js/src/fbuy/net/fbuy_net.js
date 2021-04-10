/** 
* FBUY_NET
* Base class for an FBUY net module
* Net modules are FBUY's IO layer: a net module subscribes to some
* FTRANS module(s) incoming network data events, determine whether incoming
* data is intended for FBUY, deserializes + validates the data -- and, for
* outbound data, preps and sends it to FTRANS for transmission
*/ 

"use strict";

const EventEmitter = require("events");

class Fbuy_net {
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

module.exports.Fbuy_net = Fbuy_net;