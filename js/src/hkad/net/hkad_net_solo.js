/** 
* HKAD_NET_SOLO
* An HKAD net module that subscribes to exactly one HTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Hkad_net } = require("./hkad_net.js");
const { Hkad_msg } = require("../hkad_msg.js");
const { Htrans } = require("../../htrans/trans/htrans.js");
const { Htrans_msg } = require("../../htrans/htrans_msg.js");

class Hkad_net_solo extends Hkad_net {
	trans;

	constructor(trans) {
		super();

		if (!(trans instanceof Htrans)) {
			throw new TypeError("Argument 'trans' must be instance of Htrans");
		}

		this.trans = trans;
		this.trans.network.on("message", this._on_message.bind(this));
	}

	_on_message(htrans_msg) {
		try {
			if (htrans_msg.type === Htrans_msg.TYPE.HKAD) {
				const msg = new Hkad_msg(htrans_msg.msg);
				this._in(msg);
			}
		} catch(err) {
			// Do nothing?
		}
	}

	_out(hkad_msg, node_info) {
		// If we're trying to send a message to ourselves, there's no need to transmit it over the wire
		// TODO: Are we sure we're supposed to be sending messages to ourselves? Should we implement this 
		// at Hkad_eng_alpha and save one frame on the call stack?
		if (node_info.node_id.equals(this.node.node_id)) {
			this._in(hkad_msg);
			return;
		}

		const htrans_msg = new Htrans_msg({
			msg: hkad_msg,
			type: Htrans_msg.TYPE.HKAD
		});

		this.trans._send(htrans_msg, node_info.addr, node_info.port);
	}
}

module.exports.Hkad_net_solo = Hkad_net_solo;