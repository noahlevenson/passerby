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
	form_id;
	items;

	constructor({type = null, name = null, address = null, phone = null, form_id = null, items = []} = {}) {
		if (!Array.isArray(items)) {
			throw new TypeError("Argument 'items' must be an Array");
		}

		this.type = type;
		this.name = name;
		this.address = address;
		this.phone = phone;
		this.form_id = form_id;
		this.items = items;
	}

	// Add an item to the order
	add(item) {
		this.items.push(item);
	}

	// Remove an item from the order by index?
	delete(i) {

	}
}

module.exports.Hbuy_order = Hbuy_order;