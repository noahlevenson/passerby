/** 
* HKAD_MSG
* The HKAD_MSG type encapsulates and provides a simple interface
* for interrogating the contents of Kademlia messages
*
*
*
*/ 

"use strict";

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
		// Mostly for sanity during development: explicitly require values 
		if (id === null || rpc === null || from === null || type === null) {
			throw new Error("Arguments cannot be null");
		}

		this.rpc = rpc;
		this.from = from;
		this.data = data;
		this.type = type;
		this.id = id;
	}

	// TODO: add getters?
}

module.exports.Hkad_msg = Hkad_msg;