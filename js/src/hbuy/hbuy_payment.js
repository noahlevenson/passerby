/** 
* HBUY_ORDER
* Class for an HBUY payment
* 
* 
* 
* 
*/ 

"use strict";

// TODO: This is all prototype-grade crap that was slugged in for the August 2020 demo - this should all be wiped and replaced with an actually functional system
class Hbuy_payment {
	static CARD_TYPE = {
		3: "AMEX",
		4: "VISA",
		5: "MASTERCARD",
		6: "DISCOVER"
	};

	pan;
	exp_year;
	exp_month;
	cvv;
	name;
	zip;

	constructor({pan = null, exp_year = null, exp_month = null, cvv = null, name = null, zip = null} = {}) {
		this.pan = pan;
		this.exp_year = exp_year;
		this.exp_month = exp_month;
		this.cvv = cvv;
		this.name = name;
		this.zip = zip;
	}

	card_type() {
		return Hbuy_payment.CARD_TYPE[this.pan[0]];
	}
}

module.exports.Hbuy_payment = Hbuy_payment;