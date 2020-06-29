/** 
* HBUY_ITEM_CUST
* Class for an HBUY item customization
* 
* 
* 
* 
*/ 

"use strict";

class Hbuy_item_cust {
	desc;
	price;

	constructor({desc = "", price = 0.00} = {}) {
		// TODO: validation
		this.desc = desc;
		this.price = price;
	}
}

module.exports.Hbuy_item_cust = Hbuy_item_cust;