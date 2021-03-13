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
	privkey;

	constructor({privkey = null} = {}) {
		this.privkey = privkey;
	}
}

module.exports.Hid_prv = Hid_prv;