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
	name;
	address;
	phone;
	items;
	grand;

	constructor({type = null, name = null, address = null, phone = null, items = []} = {}) {
		if (!Array.isArray(items)) {
			throw new TypeError("Argument 'items' must be an Array");
		}

		this.type = type;
		this.name = name;
		this.address = address;
		this.phone = phone;
		this.items = items;
		this.grand = this.total();
	}

	// Add an item to the order
	add() {

	}

	// Remove an item from the order by index?
	delete(i) {

	}

	// Get the sum of all times pre-tax
	subtotal() {

	}

	// Get the sum of all items plus all taxes
	total() {
		return 69.69;
	}
}

module.exports.Hbuy_order = Hbuy_order;