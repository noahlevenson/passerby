/** 
* HBUY_PMENT
* Base class for an HBUY payment
* 
* 
* 
* 
*/ 

"use strict";

class Hbuy_pment {
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

module.exports.Hbuy_pment = Hbuy_pment;