/** 
* FKAD_NET
* Base class for an FKAD net module
* Net modules are FKAD's IO layer: a net module subscribes to some
* FTRANS module(s) incoming network data events, determine whether incoming
* data is intended for FKAD, deserializes + validates the data -- and, for
* outbound data, preps and sends it to FTRANS for transmission
*/ 

"use strict";

const EventEmitter = require("events");

class Fkad_net {
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

module.exports.Fkad_net = Fkad_net;