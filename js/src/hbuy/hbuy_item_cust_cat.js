/** 
* HBUY_ITEM_CUST_CAT
* Class for an HBUY item customization category
* 
* 
* 
* 
*/ 

"use strict";

class Hbuy_item_cust_cat {
	desc;
	custs;
	min;
	max;
	choice;

	constructor({desc = "", custs = [], min = 0, max = Number.POSITIVE_INFINITY, choice = new Set()} = {}) {
		// TODO: validation
		this.desc = desc;
		this.custs = custs;
		this.min = min;
		this.max = max;
		this.choice = choice;
	}
}

module.exports.Hbuy_item_cust_cat = Hbuy_item_cust_cat;