/** 
* FBUY_PMENT
* Base class for an FBUY payment
* 
* 
* 
* 
*/ 

"use strict";

class Fbuy_pment {
	static TYPE = {
		CASH: 0,
		AMEX: 3,
		VISA: 4,
		MC: 5,
		DISC: 6
	};

	constructor({type = null} = {}) {
		this.type = type;
	}
}

module.exports.Fbuy_pment = Fbuy_pment;