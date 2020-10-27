/** 
* HID_PUBLIC_DATA
* A HID_PUBLIC_DATA object encapsulates HID information
* about a peer that the peer wants to share, maybe cross platform
* It enforces primitive types so it's easy to serialize
*
*
*/ 

"use strict";

const { Hid } = require("./hid.js");

class Hid_public_data {
	name;
	peer_id;

	constructor({first = null, last = null, peer_id = null} = {}) {
		if (typeof first !== "string") {
			throw new TypeError("'first' must be string");
		}

		if (typeof last !== "string") {
			throw new TypeError("'last' must be string");
		}

		if (typeof peer_id !== "string") {
			throw new TypeError("'peer_id' must be string");
		}

		this.first = first;
		this.last = last;
		this.peer_id = peer_id;
	}

	static from_hid(hid) {
		if (!(hid instanceof Hid)) {
			throw new TypeError("'hid' must be an instance of Hid")
		}

		const pd = new this({
			first: hid.first,
			last: hid.last,
			peer_id: hid.peer_id.toString()
		});

		return pd;
	}
}

module.exports.Hid_public_data = Hid_public_data;