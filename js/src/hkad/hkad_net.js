const EventEmitter = require("events");

// Base class for a hoodnet network module
class Hkad_net {
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

module.exports.Hkad_net = Hkad_net;