/** 
* HBUY_NET_SOLO
* An HBUY net module that subscribes to exactly one HTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Hbuy_net } = require("./hbuy_net.js");
const { Hbuy_msg } = require("../hbuy_msg.js");
const { Htrans } = require("../../htrans/trans/htrans.js");
const { Htrans_msg } = require("../../htrans/htrans_msg.js");

class Hbuy_net_solo extends Hbuy_net {
	trans;

	constructor(trans) {
		super();

		if (!(trans instanceof Htrans)) {
			throw new TypeError("Argument 'trans' must be instance of Htrans");
		}

		this.trans = trans;
		this.trans.network.on("message", this._on_message.bind(this));
	}

	// Currently, HTRANS_UDP emits the rinfo object as a second argument. HKAD ignores it, and HSTUN and HBUY listen for it...
	// TODO: In the future, we prob want to roll our own generalized "remote info" data type, because, for example,
	// I'm not sure if Node's TCP implementation provides rinfo objects -- so an HTRANS_TCP might not be able to supply an rinfo 
	// in the same way as HTRANS_UDP, and we lose all the generality...
	_on_message(htrans_msg, rinfo) {
		try {
			if (htrans_msg.type === Htrans_msg.TYPE.HBUY) {
				const msg = new Hbuy_msg(htrans_msg.msg);
				this._in(msg, rinfo);
			}
		} catch(err) {
			// Silently ignore it?
		}
	}

	_out(hbuy_msg, rinfo) {
		// msg is a STUN message delivered from HSTUN
		const htrans_msg = new Htrans_msg({
			msg: hbuy_msg,
			type: Htrans_msg.TYPE.HSTUN
		});

		this.trans._send(htrans_msg, rinfo.address, rinfo.port);
	}
}

module.exports.Hbuy_net_solo = Hbuy_net_solo;