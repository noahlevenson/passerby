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
	choice;
	spec_inst;

	constructor({name = "", desc = "", sizes = [], choice = null, spec_inst = ""} = {}) {
		// TODO: validation
		this.name = name;
		this.desc = desc;
		this.sizes = sizes;
		this.choice = choice;
		this.spec_inst = spec_inst;
	}
}

module.exports.Hbuy_item = Hbuy_item;