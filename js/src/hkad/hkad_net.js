const EventEmitter = require("events");

// Base class for an HKAD network module, which is basically a translation and validation layer that connects an HTRANS data transport to the HKAD_ENG engine
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

	}
}

module.exports.Hkad_net = Hkad_net;