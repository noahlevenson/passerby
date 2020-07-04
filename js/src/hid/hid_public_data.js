/** 
* HID_PUBLIC_DATA
* A HID_PUBLIC_DATA object encapsulates HID information
* about a peer that the peer wants to share publicly
* 
*
*
*/ 

"use strict";

class Hid_public_data {
	name;
	peer_id;

	constructor({name = null, peer_id = null} = {}) {
		this.name = name;
		this.peer_id = peer_id;
	}
}

module.exports.Hid_public_data = Hid_public_data;