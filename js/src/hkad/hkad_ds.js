/** 
* HKAD_DS
* Class for an HKAD data store
* 
* 
* 
* 
*/ 

"use strict";

const { Hkad_ds_rec } = require("./hkad_ds_rec.js");

class Hkad_ds {
	data;

	constructor() {
		this.data = new Map();
	}

	put({key, val, ttl} = {}) {
		const rec = new Hkad_ds_rec({
			ttl: ttl,
			data: val
		});

		this.data.set(key, rec);
	}

	get(key) {
		return this.data.get(key);
	}

	// Get a 2D array of all [key, val] pairs
	entries() {
		return this.data.entries();
	}

	delete(key) {
		return this.data.delete(key);
	}
}

module.exports.Hkad_ds = Hkad_ds;