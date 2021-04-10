/** 
* FBUY_NET_SOLO
* An FBUY net module that subscribes to exactly one FTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Fbuy_net } = require("./fbuy_net.js");
const { Fbuy_msg } = require("../fbuy_msg.js");
const { Ftrans } = require("../../ftrans/trans/ftrans.js");
const { Ftrans_msg } = require("../../ftrans/ftrans_msg.js");

class Fbuy_net_solo extends Fbuy_net {
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
		try {
			if (ftrans_msg.type === Ftrans_msg.TYPE.FBUY) {
				const msg = new Fbuy_msg(ftrans_msg.msg);
				this._in(msg, rinfo);
			}
		} catch(err) {
			// Silently ignore it?
		}
	}

	_out(fbuy_msg, rinfo) {
		const ftrans_msg = new Ftrans_msg({
			msg: fbuy_msg,
			type: Ftrans_msg.TYPE.FBUY
		});

		this.trans._send(ftrans_msg, rinfo.address, rinfo.port);
	}
}

module.exports.Fbuy_net_solo = Fbuy_net_solo;