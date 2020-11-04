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
	static TYPE = {
		DELIVERY: 0,
		PICKUP: 1
	};

	type;
	item_refs;
	misc_items;
	tip;
	comment;

	constructor({type = null, item_refs = [], misc_items = [], tip = null, comment = null} = {}) {
		this.type = type;
		this.item_refs = item_refs;
		this.misc_items = misc_items;
		this.tip = tip;
		this.comment = comment;
	}

	// Add a standard item to the order
	add(item_ref) {
		this.item_refs.push(item_ref);
	}

	// Add a misc item to the order
	add_misc(misc_item) {
		this.misc_items.push(misc_item);
	}

	// Remove a standard item from the order by index?
	delete(i) {

	}

	// Remove a misc item from the order by index?
	delete_misc(i) {

	}
}

module.exports.Hbuy_order = Hbuy_order;