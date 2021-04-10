/** 
* FBUY_ITEM_CUST
* Class for an FBUY item customization
* 
* 
* 
* 
*/ 

"use strict";

class Fbuy_item_cust {
	desc;
	price;

	constructor({desc = "", price = 0.00} = {}) {
		// TODO: validation
		this.desc = desc;
		this.price = price;
	}
}

module.exports.Fbuy_item_cust = Fbuy_item_cust;