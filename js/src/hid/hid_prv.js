/** 
* HID_PRV
* A HID_PRV is the private half of our identity system
* It encapsulates identity info about a peer that
* must never be shared
* 
*
*/ 

"use strict";

const { Happ_env } = require("../happ/happ_env.js");
const { Hutil } = require("../hutil/hutil.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

class Hid_prv {
	_pk;

	constructor({privkey = null} = {}) {
		this._pk = privkey
	}

	get_private_key() {
		return this._pk;
	}
}

module.exports.Hid_prv = Hid_priv;