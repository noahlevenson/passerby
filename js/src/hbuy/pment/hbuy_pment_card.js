/** 
* HBUY_PMENT_CARD
* HBUY_PMENT_CARD extends HBUY_PMENT
* to represent an instance of a credit card
* 
* 
* 
*/ 

"use strict";

const { Hbuy_pment } = require("./hbuy_pment.js");

class Hbuy_pment_card extends Hbuy_pment {
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

module.exports.Hbuy_pment_card = Hbuy_pment_card;