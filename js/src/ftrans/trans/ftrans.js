/** 
* FTRANS
* Base class for a transport service
* An FTRANS module provides systemwide network IO --
* every network-enabled component must subscribes to some FTRANS
* network event(s) to receive data, and send data using some FTRANS
* _send method
*/ 

"use strict";

const EventEmitter = require("events");

class Ftrans {
	network;

	constructor() {
		this.network = new EventEmitter();
	}
	
	_on_message() {
		throw new Error("Subclasses must implement the _on_message() method");
	}

	_send() {
		throw new Error("Subclasses must implement the _send() method");
	}
}

module.exports.Ftrans = Ftrans;