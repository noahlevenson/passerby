/** 
* FID_PUB
* A FID_PUB is the public half of our identity system
* It encapsulates identity info about a peer that's
* safe to share, and it enforces primitive types
* so that it's easy to serialize
*
*/ 

"use strict";

const { Futil } = require("../futil/futil.js");

class Fid_pub {
	pubkey;
	name;
	first;
	last;
	address;
	phone;
	lat;
	long;
	peer_id;
	nonce;

	constructor({pubkey = null, name = null, first = null, last = null, address = null, phone = null, lat = null, long = null}  = {}) {
		// TODO: validation, enforce primitive types

		this.pubkey = pubkey;
		this.name = name; // TODO: name is for restaurants, where first/last are for people. Too complex?
		this.first = first;
		this.last = last;
		this.address = address;
		this.phone = phone;
		this.lat = lat;
		this.long = long;
		this.peer_id = Futil._sha1(this.pubkey);
		this.nonce = "00"; // Need two digits for Buffer to parse correctly
	}

	static inc_nonce(fid_pub) {
		const unpad = (parseInt(fid_pub.nonce, 16) + 1).toString(16);
		fid_pub.nonce = unpad.padStart(unpad.length + (unpad.length % 2), "0");
	}
}

module.exports.Fid_pub = Fid_pub;