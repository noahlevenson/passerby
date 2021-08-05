/** 
* FBUY_TAX
* Abstraction for sales tax, VAT, etc.
* 
* 
* 
* 
*/ 

"use strict";

class Fbuy_tax {
  desc;
  rate;

  constructor({desc = "", rate = 0.00} = {}) {
    // TODO: validation
    this.desc = desc;
    this.rate = rate;
  }
}

module.exports.Fbuy_tax = Fbuy_tax;