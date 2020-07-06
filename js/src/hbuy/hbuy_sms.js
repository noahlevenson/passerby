/** 
* HBUY_SMS
* An HBUY_SMS describes a short text message
* and accompanying data, useful for chat
* 
* 
* 
*/ 

"use strict";

const { Hid_public_data } = require("../hid/hid_public_data.js");

class Hbuy_sms {
	static MAX_CHARS = 4096;

	text;
	data;
	from;

	constructor({text = null, data = [], from = null} = {}) {
		if (!Array.isArray(data)) {
			throw new TypeError("Argument 'data' must be array");
		}

		if (!(from instanceof Hid_public_data)) {
			throw new TypeError("Argument 'from' must be a Hid_public_data object");
		}

		// Enforce MAX_CHARS
		if (text === null) {
			this.text = text;
		} else {
			this.text = text.length < Hbuy_sms.MAX_CHARS ? text : text.substring(0, Hbuy_sms.MAX_CHARS);
		}

		this.data = data;
		this.from = from;
	}
}

module.exports.Hbuy_sms = Hbuy_sms;