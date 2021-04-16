/** 
* FSTUN_NET_SOLO
* An FSTUN net module that subscribes to exactly one FTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Fstun_net } = require("./fstun_net.js");
const { Ftrans } = require("../../ftrans/trans/ftrans.js");
const { Ftrans_msg } = require("../../ftrans/ftrans_msg.js");

class Fstun_net_solo extends Fstun_net {
	trans;

	constructor(trans) {
		super();

		if (!(trans instanceof Ftrans)) {
			throw new TypeError("Argument 'trans' must be instance of Ftrans");
		}

		this.trans = trans;
		this.trans.network.on("message", this._on_message.bind(this));
	}

	// Currently, FTRANS_UDP emits the rinfo object as a second argument. FKAD ignores it, and FSTUN and FBUY listen for it...
	// TODO: In the future, we prob want to roll our own generalized "remote info" data type, because, for example,
	// I'm not sure if Node's TCP implementation provides rinfo objects -- so an FTRANS_TCP might not be able to supply an rinfo 
	// in the same way as FTRANS_UDP, and we lose all the generality...
	_on_message(ftrans_msg, rinfo) {
		// This ftrans_msg is delivered from the FTRANS module, so it's a rehydrated Ftrans object
		// FTRANS guarantees that this is a valid FTRANS object, but we need to know if it's of the FSTUN type...
		// Since an FSTUN message is a binary Buffer, we don't validate it here -- it'll get validated or discarded by the FSTUN module
		try {
			if (ftrans_msg.type === Ftrans_msg.TYPE.FSTUN) {
				this._in(Buffer.from(ftrans_msg.msg), rinfo);
			}
		} catch(err) {
			// Silently ignore it?
		}
	}

	_out(msg, rinfo) {
		// msg is a STUN message delivered from FSTUN
		const ftrans_msg = new Ftrans_msg({
			msg: msg,
			type: Ftrans_msg.TYPE.FSTUN
		});

		this.trans._send(ftrans_msg, rinfo);
	}
}

module.exports.Fstun_net_solo = Fstun_net_solo;