/** 
* HKAD_NET
* Base class for an HKAD net module
* Net modules are HKAD's IO layer: a net module subscribes to some
* HTRANS module(s) incoming network data events, determine whether incoming
* data is intended for HKAD, deserializes + validates the data -- and, for
* outbound data, preps and sends it to HTRANS for transmission
*/ 

"use strict";

const EventEmitter = require("events");

class Hkad_net {
	network;
	node;

	constructor() {
		this.network = new EventEmitter();
		this.node = null;
	}

	_in(msg) {
		this.network.emit("message", msg);
	}

	_out(msg, node_info) {
		throw new Error("Subclasses must implement the _out() method");
	}
}

module.exports.Hkad_net = Hkad_net;