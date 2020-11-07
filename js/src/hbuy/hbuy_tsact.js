/** 
* HBUY_TSACT
* An HBUY_TSACT encapsusaltes an order transaction,
* combining an order, a payment, and an identity
*
*
*
*/ 

"use strict";

class Hbuy_tsact {
	static ID_LEN = 8;
	
	order;
	pment;
	from;
	id;

	constructor({order = null, pment = null, from = null, id = null} = {}) {
		this.order = order;
		this.pment = pment;
		this.from = from;
		this.id = id;
	}
}

module.exports.Hbuy_tsact = Hbuy_tsact;