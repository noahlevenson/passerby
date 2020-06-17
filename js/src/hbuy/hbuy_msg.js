/** 
* HBUY_MSG
* The HBUY_MSG type encapsulates and provides a simple interface
* for interrogating the contents of HBUY messages
*
*
*
*/ 

"use strict";

class Hbuy_msg {
	static TYPE = {
		REQ: 0,
		RES: 1
	};

	static FLAVOR = {
		TRANSACT: 0,
		STATUS: 1
	}

	from;
	data;
	type;
	flavor;
	id;

	constructor({from = null, data = null, type = null, flavor = null, id = null} = {}) {
		// Mostly for sanity during development: explicitly require values 
		if (id === null || from === null || type === null || flavor === null) {
			throw new Error("Arguments cannot be null");
		}

		this.from = from;
		this.data = data;
		this.type = type;
		this.flavor = flavor;
		this.id = id;
	}

	// TODO: add getters?
}

module.exports.Hbuy_msg = Hbuy_msg;