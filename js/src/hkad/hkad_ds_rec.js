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
	created;
	data;

	constructor({ttl, data} = {}) {
		if (typeof ttl !== "number" || !data) {
			throw new Error("Must supply values for 'ttl' and 'data'");
		}

		this.ttl = ttl;
		this.data = data;
		this.created = Date.now();
	}

	get_created() {
		return this.created;
	}

	get_ttl() {
		return this.ttl;
	}

	get_data() {
		return this.data;
	}
}

module.exports.Hkad_ds_rec = Hkad_ds_rec;