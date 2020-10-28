/** 
* HAPP_BBOARD
* HAPP_BBOARD (billboard) is to Free Food what torrents 
* are to BitTorrent: they are publicly shareable data 
* entities which describe a network resource (food)
* A restaurant publishes a Happ_bboard to make itself 
* discoverable to diners
*/ 

"use strict";

class Happ_bboard {
	cred;
	form;

	constructor({cred = null, form = null}  = {}) {
		// TODO: validation
		this.cred = cred; // Generalization of a signed cryptographic certificate
		this.form = form; // Generalization of a food menu
	}
}

module.exports.Happ_bboard = Happ_bboard;