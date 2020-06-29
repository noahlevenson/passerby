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
	desc;
	sizes;
	choice;
	spec_inst;

	constructor({desc = "", sizes = [], choice = null, spec_inst = ""} = {}) {
		// TODO: validation
		this.desc = desc;
		this.sizes = sizes;
		this.choice = choice;
		this.spec_inst = spec_inst;
	}
}

module.exports.Hbuy_item = Hbuy_item;