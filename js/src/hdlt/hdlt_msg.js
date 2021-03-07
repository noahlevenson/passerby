/** 
* HDLT_MSG
* The HDLT_MSG type encapsulates and provides a simple 
* interface for interrogating the contents of HDLT messages
* 
*
*
*/ 

"use strict";

class Hdlt_msg {
	static ID_LEN = 12;

	static TYPE = {
		REQ: 0,
		RES: 1
	};

	static FLAVOR = {
		// TODO: what do we need? inv, getblocks, tx...?
	};

	type;
	flavor;
	id;

	constructor({type = null, flavor = null, id = null} = {}) {
		// Mostly for sanity during development: explicitly require values 
		if (type === null || flavor === null || id === null) {
			throw new Error("Arguments cannot be null");
		}

		this.type = type;
		this.flavor = flavor;
		this.id = id;
	}
};

module.exports.Hdlt_msg = Hdlt_msg;