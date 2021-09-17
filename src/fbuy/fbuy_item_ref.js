/** 
* FBUY_ITEM_REF
* Reference to an item from an Fbuy_menu or similar order form
* 
* 
* 
* 
* 
*/ 

"use strict";

class Fbuy_item_ref {
  form_id;
  froz_idx;
  size_idx;
  cust_cats_idx;
  qty;
  comment;

  constructor({
    form_id = null, 
    froz_idx = null, 
    size_idx = null, 
    cust_cats_idx = [], 
    qty = 1, 
    comment = null
  } = {}) {
    this.form_id = form_id;
    this.froz_idx = froz_idx;
    this.size_idx = size_idx;
    this.cust_cats_idx = cust_cats_idx;
    this.qty = qty;
    this.comment = comment;
  }
}

module.exports.Fbuy_item_ref = Fbuy_item_ref;