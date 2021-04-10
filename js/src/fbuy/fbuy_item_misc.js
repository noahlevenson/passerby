/** 
* FBUY_ITEM_MISC
* An FBUY_ITEM_MISC is a miscellaneous non-menu item
* used for ad hoc purchases or adjustments
* 
* 
* 
*/ 

"use strict";

class Fbuy_item_misc {
	desc;
	price;
	qty;

	constructor({desc = "", price = 0.00, qty = 1} = {}) {
		// TODO: validation
		this.desc = desc;
		this.price = price;
		this.qty = qty;
	}
}

module.exports.Fbuy_item_misc = Fbuy_item_misc;