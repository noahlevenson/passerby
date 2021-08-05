/** 
* FBUY_ITEM
* A purchasable entity
* 
* 
* 
* 
*/ 

"use strict";

class Fbuy_item {
  name;
  desc;
  sizes;

  constructor({name = "", desc = "", sizes = []} = {}) {
    // TODO: validation
    this.name = name;
    this.desc = desc;
    this.sizes = sizes;
  }
}

module.exports.Fbuy_item = Fbuy_item;