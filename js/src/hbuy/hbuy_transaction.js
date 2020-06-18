/** 
* HBUY_TRANSACTION
* An HBUY_TRANSACTION combines an HBUY_ORDER with an HBUY_PAYMENT
* 
*
*
*
*/ 

"use strict";

class Hbuy_transaction {
	order;
	payment;
	id;

	constructor({order = null, payment = null, id = null} = {}) {
		this.order = order;
		this.payment = payment;
		this.id = id;
	}

	get_id() {
		return this.id;
	}
}

module.exports.Hbuy_transaction = Hbuy_transaction;