const EventEmitter = require("events");

// Base class for a transport service
class Htrans {
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

module.exports.Htrans = Htrans;