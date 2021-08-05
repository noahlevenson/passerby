/** 
* FBUY_ITEM_SIZE
* Size option for a purchasable entity
* 
* 
* 
* 
*/ 

"use strict";

class Fbuy_item_size {
  desc;
  price;
  cust_cats;

  constructor({desc = "", price = 0.00, cust_cats = []} = {}) {
    // TODO: validation
    this.desc = desc;
    this.price = price;
    this.cust_cats = cust_cats;
  }
}

module.exports.Fbuy_item_size = Fbuy_item_size;