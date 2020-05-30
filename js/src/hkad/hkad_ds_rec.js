/** 
* HKAD_DS_REC
* Class for an HKAD data store record
* 
* 
* 
* 
*/ 

"use strict";

class Hkad_ds_rec {
	ttl;
	data;

	constructor({ttl, data} = {}) {
		if (typeof ttl !== "number" || !data) {
			throw new Error("Must supply values for 'ttl' and 'data'");
		}

		this.ttl = ttl;
		this.data = data;
	}

	get_data() {
		return this.data;
	}

	get_ttl() {
		return this.ttl;
	}
}

module.exports.Hkad_ds_rec = Hkad_ds_rec;