const EventEmitter = require("events");

// Base class for an HSTUN network module, which is basically a translation and validation layer that connects an HTRANS data transport to the HSTUN main brain / services module
class Hstun_net {
	network;

	constructor() {
		this.network = new EventEmitter();
	}

	_in(msg, rinfo) {
		this.network.emit("message", msg, rinfo);
	}

	_out(msg, rinfo) {

	}
}

module.exports.Hstun_net = Hstun_net;