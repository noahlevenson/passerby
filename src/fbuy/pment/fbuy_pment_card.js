/** 
* FBUY_PMENT_CARD
* A credit card
* 
* 
* 
* 
*/ 

"use strict";

const { Fbuy_pment } = require("./fbuy_pment.js");

class Fbuy_pment_card extends Fbuy_pment {
  pan;
  exp_year;
  exp_month;
  cvv;
  zip;
  
  constructor({
    pan = null, 
    exp_year = null, 
    exp_month = null, 
    cvv = null, 
    zip = null
  } = {}) {
    super({type: parseInt(pan[0])});
    this.pan = pan;
    this.exp_year = exp_year;
    this.exp_month = exp_month;
    this.cvv = cvv;
    this.zip = zip;
  }
}

module.exports.Fbuy_pment_card = Fbuy_pment_card;