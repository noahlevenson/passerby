/** 
* HBUY_ORDER
* Class for an HBUY order
* 
* 
* 
* 
*/ 

"use strict";

class Hbuy_order {
	ffment;
	item_refs;
	misc_items;
	tip;
	comment;

	constructor({ffment = null, item_refs = [], misc_items = [], tip = 0.00, comment = null} = {}) {
		this.ffment = ffment;
		this.item_refs = item_refs;
		this.misc_items = misc_items;
		this.tip = tip;
		this.comment = comment;
	}
}

module.exports.Hbuy_order = Hbuy_order;