/** 
* FBUY_ITEM_CUST_CAT
* Class for an FBUY item customization category
* 
* 
* 
* 
*/ 

"use strict";

class Fbuy_item_cust_cat {
	desc;
	custs;
	min;
	max;

	constructor({desc = "", custs = [], min = 0, max = Number.POSITIVE_INFINITY} = {}) {
		// TODO: validation
		this.desc = desc;
		this.custs = custs;
		this.min = min;
		this.max = max;
	}
}

module.exports.Fbuy_item_cust_cat = Fbuy_item_cust_cat;