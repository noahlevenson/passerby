/** 
* HBUY_ITEM
* Class for an HBUY item
* 
* 
* 
* 
*/ 

"use strict";

class Hbuy_item {
	name;
	desc;
	sizes;

	constructor({name = "", desc = "", sizes = []} = {}) {
		// TODO: validation
		this.name = name;
		this.desc = desc;
		this.sizes = sizes;
	}
}

module.exports.Hbuy_item = Hbuy_item;