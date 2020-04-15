const crypto = require("crypto");

// Class for a hoodnet message object
class Hmsg {
	// I think RPC constants should be part of Hnode rather than Hmsg - or we can create some global constants in hoodnet.js
	static RPC = {
		PING: 0,
		STORE: 1,
		FIND_NODE: 2,
		FIND_VALUE: 3
	};

	constructor({rpc = null, from = null, data = null, res = false, id = Hmsg.generate_random_key()} = {}) { // I feel like generate_random_key() should probably be part of Hmsg, not Hnode
		this.rpc = rpc;
		this.from = from;
		this.data = data;
		this.res = res;
		this.id = id;
	}

	static generate_random_key(len) {
		if (!len) {
			// This is a hack just to keep moving - we need to fix circular dependencies so generate_random_key() doesn't require an argument
			len = 160 / 8
		}

		return BigInt(`0x${crypto.randomBytes(len).toString("hex")}`);
	}
}

module.exports.Hmsg = Hmsg;