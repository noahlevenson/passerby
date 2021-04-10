/** 
* FID_PRV
* A FID_PRV is the private half of our identity system
* It encapsulates identity info about a peer that
* must never be shared
* 
*
*/ 

"use strict";

class Fid_prv {
	privkey;

	constructor({privkey = null} = {}) {
		this.privkey = privkey;
	}
}

module.exports.Fid_prv = Fid_prv;