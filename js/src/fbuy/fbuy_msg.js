/** 
* FBUY_MSG
* The FBUY_MSG type encapsulates and provides a simple interface
* for interrogating the contents of FBUY messages
*
*
*
*/ 

"use strict";

class Fbuy_msg {
	static ID_LEN = 12;

	static TYPE = {
		REQ: 0,
		RES: 1
	};

	static FLAVOR = {
		TRANSACT: 0,
		STATUS: 1,
		SMS: 2
	};

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

module.exports.Fbuy_msg = Fbuy_msg;