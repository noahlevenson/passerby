// Base class for a hoodnet message engine
class Hkad_eng {
	node;

	constructor() {
		this.node = null;
	}

	_on_message(msg) {
		throw new Error("Subclasses must implement the _on_message() method");
	}

	_send(msg, node_info, success, timeout) {
		throw new Error("Subclasses must implement the _send() method");
	}
}

module.exports.Hkad_eng = Hkad_eng;