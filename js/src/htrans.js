const EventEmitter = require("events");

// Base class for a hoodnet transport module
class Htrans {
	constructor() {
		this.network = new EventEmitter();
	}

	in(msg) {
		this.network.emit("message", msg);
	}
}

module.exports.Htrans = Htrans;