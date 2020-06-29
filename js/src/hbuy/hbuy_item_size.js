/** 
* HBUY_ITEM_SIZE
* Class for an HBUY item size
* 
* 
* 
* 
*/ 

"use strict";

class Hbuy_item_size {
	desc;
	price;
	cust_cats;

	constructor({desc = "", price = 0.00, cust_cats = []} = {}) {
		// TODO: validation
		this.desc = desc;
		this.price = price;
		this.cust_cats = cust_cats;
	}
}

module.exports.Hbuy_item_size = Hbuy_item_size;