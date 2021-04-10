/** 
* FDLT_NET_SOLO
* An FDLT net module that subscribes to exactly one FTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Fdlt_net } = require("./fdlt_net.js");
const { Fdlt_msg } = require("../fdlt_msg.js");
const { Ftrans } = require("../../ftrans/trans/ftrans.js");
const { Ftrans_msg } = require("../../ftrans/ftrans_msg.js");

class Fdlt_net_solo extends Fdlt_net {
	trans;
	app_id;

	// TODO: FDLT net modules require an app_id because we support multiple instances
	// of FDLTs to provide mutliple services for FAPP - but we should prob make app_id
	// part of the Fdlt_net base class, not subclasses?
	constructor(trans, app_id) {
		super();

		if (!(trans instanceof Ftrans)) {
			throw new TypeError("Argument 'trans' must be instance of Ftrans");
		}

		if (typeof app_id !== "string") {
			throw new Error("You must provide an app_id");
		}

		this.trans = trans;
		this.trans.network.on("message", this._on_message.bind(this));
		this.app_id = app_id;
	}

	// Currently, FTRANS_UDP emits the rinfo object as a second argument. FKAD ignores it, and FSTUN and FBUY and FDLT listen for it...
	// TODO: In the future, we prob want to roll our own generalized "remote info" data type, because, for example,
	// I'm not sure if Node's TCP implementation provides rinfo objects -- so an FTRANS_TCP might not be able to supply an rinfo 
	// in the same way as FTRANS_UDP, and we lose all the generality...
	_on_message(ftrans_msg, rinfo) {
		try {
			if (ftrans_msg.type === Ftrans_msg.TYPE.FDLT && ftrans_msg.msg.app_id === this.app_id) {
				const msg = new Fdlt_msg(ftrans_msg.msg);
				this._in(msg, rinfo);
			}
		} catch(err) {
			// Silently ignore it?
		}
	}

	_out(fdlt_msg, rinfo) {
		const ftrans_msg = new Ftrans_msg({
			msg: fdlt_msg,
			type: Ftrans_msg.TYPE.FDLT
		});

		this.trans._send(ftrans_msg, rinfo.address, rinfo.port);
	}
}

module.exports.Fdlt_net_solo = Fdlt_net_solo;