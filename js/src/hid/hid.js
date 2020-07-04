/** 
* HID
* An HID is a global identity, used for
* authentication, authorization, and generally
* persisting identity on the network
*
*
*/ 

"use strict";

const { Happ_env } = require("../happ/happ_env.js");
const { Hid_public_data } = require("./hid_public_data.js");
const { Hutil } = require("../hutil/hutil.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

// TODO: Make private information non-enumerable so it won't serialize if we accidentally try to transmit an Hid
class Hid {
	public_key;
	private_key;
	name;
	address;
	phone;
	lat;
	long;
	peer_id;

	constructor({public_key = null, private_key = null, name = null, address = null, phone = null, lat = null, long = null} = {}) {
		// TODO: validation
		this.public_key = public_key;
		this.private_key = private_key;
		this.name = name;
		this.address = address;
		this.phone = phone;
		this.lat = lat;
		this.long = long;
		this.peer_id = new Hbigint(Hutil._sha1(this.public_key));
	}

	public_data() {
		return new Hid_public_data({name: this.name, peer_id: this.peer_id});
	}
}

module.exports.Hid = Hid;