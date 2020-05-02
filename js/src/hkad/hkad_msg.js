// Class for a hoodnet message object
class Hkad_msg {
	static RPC = {
		PING: 0,
		STORE: 1,
		FIND_NODE: 2,
		FIND_VALUE: 3
	};

	static TYPE = {
		REQ: 0,
		RES: 1
	};

	rpc;
	from;
	data;
	type;
	id;

	constructor({rpc = null, from = null, data = null, type = null, id = null} = {}) {
		// This is mostly for sanity during development - we should always explicitly add an RPC ID to our messages
		// so that we don't make the mistake of sending a reply with the wrong RPC ID
		if (id === null) {
			throw new Error("id field cannot be null my guy");
		}

		if (rpc === null || from === null || type === null) {
			throw new Errror("bro what are you doing with this Hkad_msg, you forgot params");
		}

		// TODO: We can implement an is_required() function and supply as default parameter like this:
		// () => { throw new Error("bro you forgot a parameter"}
		// my_parameter = the above function

		this.rpc = rpc;
		this.from = from;
		this.data = data;
		this.type = type;
		this.id = id;
	}
}

module.exports.Hkad_msg = Hkad_msg;