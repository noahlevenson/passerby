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
	froz_idx;
	size_idx;
	cust_cats_idx;
	qty;
	comment;

	constructor({form_id = null, froz_idx = null, size_idx = null, cust_cats_idx = [], qty = 1, comment = null} = {}) {
		this.form_id = form_id;
		this.froz_idx = froz_idx;
		this.size_idx = size_idx;
		this.cust_cats_idx = cust_cats_idx;
		this.qty = qty;
		this.comment = comment;
	}
}

module.exports.Hbuy_item_ref = Hbuy_item_ref;