// Class for a hoodnet message object
class Hmsg {
	// I think RPC constants should be part of Hnode rather than Hmsg - or we can create some global constants in hoodnet.js
	static RPC = {
		PING: 0,
		STORE: 1,
		FIND_NODE: 2,
		FIND_VALUE: 3
	};

	constructor({rpc = null, from = null, data = null, res = false, id = null} = {}) {
		// This is mostly for sanity during development - we should always explicitly add an RPC ID to our messages
		// so that we don't make the mistake of sending a reply with the wrong RPC ID
		if (id === null) {
			throw new Error("id field cannot be null my guy");
		}

		if (rpc === null || from === null || res === null) {
			throw new Errror("bro what are you doing with this Hmsg, you forgot params");
		}

		// TODO: We can implement an is_required() function and supply as default parameter like this:
		// () => { throw new Error("bro you forgot a parameter"}
		// my_parameter = the above function

		this.rpc = rpc;
		this.from = from;
		this.data = data;
		this.res = res;
		this.id = id;
	}
}

module.exports.Hmsg = Hmsg;