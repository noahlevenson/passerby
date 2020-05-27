/** 
* HTRANS_MSG
* Class for an HTRANS message
* Serialized HTRANS messages (as buffers) are our over-the-wire format
* 
* 
* 
*/ 

"use strict";

class Htrans_msg {
	static TYPE = {
		HKAD: 0,
		HSTUN: 1
	};

	msg;
	type;

	constructor({msg = null, type = null} = {}) {
		// TODO: Validation
		// Since this is our over-the-wire format, we want to have checks in the constructor
		// to discern between a valid dehydrated Htrans_msg and what might be some other garbage packet of information that may
		// have been sent to a peer by accident or maliciously
		
		this.msg = msg;
		this.type = type;
	}
}

module.exports.Htrans_msg = Htrans_msg;