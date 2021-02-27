/** 
* HID_PRV
* A HID_PRV is the private half of our identity system
* It encapsulates identity info about a peer that
* must never be shared
* 
*
*/ 

"use strict";

class Hid_prv {
	pk;

	constructor({privkey = null} = {}) {
		this.pk = privkey
	}

	get_privkey() {
		return this.pk;
	}
}

module.exports.Hid_prv = Hid_priv;