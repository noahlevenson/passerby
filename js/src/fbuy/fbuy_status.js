/** 
* FBUY_STATUS
* An FBUY_STATUS encapsulates a status information  
* for a given transaction ID
*
*
*
*/ 

"use strict";

class Fbuy_status {
	static CODE = {
		CONFIRMED: 0
	}

	id;
	code;

	constructor({id = null, code = null} = {}) {
		this.id = id;
		this.code = code;
	}

	// TODO: getters and setters
}

module.exports.Fbuy_status = Fbuy_status;