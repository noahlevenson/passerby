/** 
* HBUY_STATUS
* An HBUY_STATUS encapsulates a status information  
* for a given transaction ID
*
*
*
*/ 

"use strict";

class Hbuy_status {
	static CODE = {
		CONFIRMED: 0
	}

	id;
	code;

	constructor({id = null, code = null} = {}) {
		this.id = id;
		this.code = code;
	}

	get_id() {
		return this.id;
	}
}

module.exports.Hbuy_status = Hbuy_status;