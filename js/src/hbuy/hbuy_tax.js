/** 
* HBUY_TAX
* Class for an HBUY tax object
* 
* 
* 
* 
*/ 

"use strict";

class Hbuy_tax {
	desc;
	rate;

	constructor({desc = "", rate = 0.00} = {}) {
		// TODO: validation
		this.desc = desc;
		this.rate = rate;
	}
}

module.exports.Hbuy_tax = Hbuy_tax;