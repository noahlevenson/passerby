/** 
* FTRANS_MSG
* Class for an FTRANS message
* Serialized FTRANS messages (as buffers) are our over-the-wire format
* 
* 
* 
*/ 

"use strict";

class Ftrans_msg {
	static ID_LEN = 8;
	
	static TYPE = {
		FKAD: 0,
		FSTUN: 1,
		FBUY: 2,
		FDLT: 3,
		ACK: 4,
	};

	msg;
	type;
	pubkey;
	sig;
	iv;
	id;

	constructor({msg = null, type = null, pubkey = null, sig = null, key = null, iv = null, id = null} = {}) {
		// TODO: Validation
		// Since this is our over-the-wire format, we want to have checks in the constructor
		// to discern between a valid dehydrated Ftrans_msg and what might be some other garbage packet of information that may
		// have been sent to a peer by accident or maliciously
		
		this.msg = msg;
		this.type = type;
		this.pubkey = pubkey; // Sender's pubkey
		this.sig = sig; // Signature of sender over msg
		this.key = key; // One time symmetric key (must be encrypted)
		this.iv = iv; // IV for one time key (send it in the clear)
		this.id = id;
	}
}

module.exports.Ftrans_msg = Ftrans_msg;