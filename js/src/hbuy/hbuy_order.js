/** 
* HBUY_ORDER
* Class for an HBUY order
* 
* 
* 
* 
*/ 

"use strict";

const { Hbuy_item_ref } = require("./hbuy_item_ref.js");
const { Hbuy_item_misc } = require("./hbuy_item_misc.js");

class Hbuy_order {
	static TYPE = {
		DELIVERY: 0,
		PICKUP: 1
	};

	type;
	item_refs;
	misc_items;

	constructor({type = null} = {}) {
		this.type = type;
		this.item_refs = [];
		this.misc_items = [];
	}

	// Add a standard item to the order
	add(item_ref) {
		if (!(item_ref instanceof Hbuy_item_ref)) {
			throw new TypeError("Argument 'item_ref' must be an Hbuy_item_ref");
		}

		this.item_refs.push(item_ref);
	}

	// Add a misc item to the order
	add_misc(misc_item) {
		if (!(misc_item instanceof Hbuy_item_misc)) {
			throw new TypeError("Argument 'misc_item' must be an Hbuy_item_misc");
		}

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