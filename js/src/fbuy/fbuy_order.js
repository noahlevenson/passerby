/** 
* FBUY_ORDER
* An order representing items requested from 
* a seller
* 
* 
* 
*/ 

"use strict";

class Fbuy_order {
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

module.exports.Fbuy_order = Fbuy_order;