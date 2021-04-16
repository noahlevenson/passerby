/** 
* FTRANS_RINFO
* Encapsulates a remote peer's contact info
* 
* 
* 
* 
*/ 

"use strict";

class Ftrans_rinfo {
	address;
	port;
	family;
	pubkey;

	constructor({address, port, family, pubkey} = {}) {	
		this.address = address;
		this.port = port;
		this.family = family;
		this.pubkey = pubkey;
	}
}

module.exports.Ftrans_rinfo = Ftrans_rinfo;