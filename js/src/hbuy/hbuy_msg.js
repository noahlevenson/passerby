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
	static ID_LEN = 12;

	static TYPE = {
		REQ: 0,
		RES: 1
	};

	static FLAVOR = {
		TRANSACT: 0,
		STATUS: 1
	}

	data;
	type;
	flavor;
	id;

	constructor({data = null, type = null, flavor = null, id = null} = {}) {
		// Mostly for sanity during development: explicitly require values 
		if (id === null || type === null || flavor === null) {
			throw new Error("Arguments cannot be null");
		}

		this.data = data;
		this.type = type;
		this.flavor = flavor;
		this.id = id;
	}

	// TODO: getters and setters
}

module.exports.Hbuy_msg = Hbuy_msg;