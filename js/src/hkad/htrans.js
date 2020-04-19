const EventEmitter = require("events");

// Base class for a hoodnet transport module
class Htrans {
	network;

	constructor() {
		this.network = new EventEmitter();
	}

	_in(msg) {
		this.network.emit("message", msg);
	}

	_out(msg, node_info) {

	}
}

module.exports.Htrans = Htrans;