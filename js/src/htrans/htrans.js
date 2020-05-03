const EventEmitter = require("events");

// Base class for a transport service
class Htrans {
	network;

	constructor() {
		this.network = new EventEmitter();
	}
	
	_on_message() {

	}

	_send() {

	}
}

module.exports.Htrans = Htrans;