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

	// TODO: maybe put should require a key, an Hkad_ds_rec object, and that's it --
	// it shouldn't concern itself with notions of TTL -- in fact, we should prob
	// create a heritable Hkad_ds_rec base class so there can be diff kinds of records w diff fields etc
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