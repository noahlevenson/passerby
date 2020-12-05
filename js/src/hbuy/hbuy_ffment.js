/** 
* HBUY_FFMENT
* An HBUY_FFMENT object describes a transaction
* fulfillment method and its associated features
* and rules -- e.g., minimum spend, the radius in
* miles from the point of sale for which this fulfullment 
* method will be honored, estimated fulfillment time, etc.
*/ 

"use strict";

class Hbuy_ffment {
	static TYPE = {
		DELIVERY: 0,
		PICKUP: 1
	};

	static DEFAULT = {
		DELIVERY: new this({type: Hbuy_ffment.TYPE.DELIVERY, min: 20.00, radius: 1.0, est: 45}),
		PICKUP: new this({type: Hbuy_ffment.TYPE.PICKUP, min: 0.00, radius: Number.POSITIVE_INFINITY, est: 20})
	};

	type;
	min;
	radius;
	est;

	constructor({type = null, min = 0.00, radius = 1.0, est = 45} = {}) {
		this.type = type;
		this.min = min;
		this.radius = radius;
		this.est = est;
	}
}

module.exports.Hbuy_ffment = Hbuy_ffment;