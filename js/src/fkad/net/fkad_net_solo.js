/** 
* FKAD_NET_SOLO
* An FKAD net module that subscribes to exactly one FTRANS transport module
* 
* 
* 
* 
*/ 

"use strict";

const { Fkad_net } = require("./fkad_net.js");
const { Fkad_msg } = require("../fkad_msg.js");
const { Ftrans } = require("../../ftrans/trans/ftrans.js");
const { Ftrans_msg } = require("../../ftrans/ftrans_msg.js");

class Fkad_net_solo extends Fkad_net {
	trans;

	constructor(trans) {
		super();

		if (!(trans instanceof Ftrans)) {
			throw new TypeError("Argument 'trans' must be instance of Ftrans");
		}

		this.trans = trans;
		this.trans.network.on("message", this._on_message.bind(this));
	}

	_on_message(ftrans_msg) {
		try {
			if (ftrans_msg.type === Ftrans_msg.TYPE.FKAD) {
				const msg = new Fkad_msg(ftrans_msg.msg);
				this._in(msg);
			}
		} catch(err) {
			// Do nothing?
		}
	}

	_out(fkad_msg, node_info) {
		// If we're trying to send a message to ourselves, there's no need to transmit it over the wire
		// TODO: Are we sure we're supposed to be sending messages to ourselves? Should we implement this 
		// at Fkad_eng_alpha and save one frame on the call stack?
		if (node_info.node_id.equals(this.node.node_id)) {
			this._in(fkad_msg);
			return;
		}

		const ftrans_msg = new Ftrans_msg({
			msg: fkad_msg,
			type: Ftrans_msg.TYPE.FKAD
		});

		this.trans._send(ftrans_msg, node_info.addr, node_info.port);
	}
}

module.exports.Fkad_net_solo = Fkad_net_solo;