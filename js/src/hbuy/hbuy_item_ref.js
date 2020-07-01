/** 
* HBUY_ITEM_REF
* An Hbuy_item_ref is the over-the-wire-format
* for a buyer's selection from an Hbuy_menu or
* other order form type
* 
* 
*/ 

"use strict";

class Hbuy_item_ref {
	form_id;
	item_list_idx;
	size_idx;
	cust_cats_idx;
	qty;

	constructor({form_id = null, item_list_idx = null, size_idx = null, cust_cats_idx = [], qty = 1} = {}) {
		this.form_id = form_id;
		this.item_list_idx = item_list_idx;
		this.size_idx = size_idx;
		this.cust_cats_idx = cust_cats_idx;
		this.qty = qty;
	}
}

module.exports.Hbuy_item_ref = Hbuy_item_ref;