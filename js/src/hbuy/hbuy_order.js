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

class Hbuy_order {
	static TYPE = {
		DELIVERY: 0,
		PICKUP: 1
	};

	type;
	item_refs;

	constructor({type = null} = {}) {
		this.type = type;
		this.item_refs = [];
	}

	// Add an item to the order
	add(item_ref) {
		if (!(item_ref instanceof Hbuy_item_ref)) {
			throw new TypeError("Argument 'item_ref' must be an Hbuy_item_ref");
		}

		this.item_refs.push(item_ref);
	}

	// Remove an item from the order by index?
	delete(i) {

	}
}

module.exports.Hbuy_order = Hbuy_order;