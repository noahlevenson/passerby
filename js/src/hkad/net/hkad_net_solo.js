const { Hkad_net } = require("../hkad_net.js");
const { Hkad_msg } = require("../hkad_msg.js");
const { Htrans } = require("../../htrans/htrans.js");
const { Htrans_msg } = require("../../htrans/htrans_msg.js");
const { Hutil } = require("../../hutil/hutil.js");

// Hkad_net_solo is an HKAD network module that uses exactly HTRANS transport
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
		// This htrans_msg is delivered from the HTRANS module, so it's a rehydrated Htrans object
		// HTRANS guarantees that this is a valid HTRANS object, but we need to know if it's of the HKAD type...
		// and then we need to make sure that the msg it contains is a valid HKAD_MSG object...
		try {
			if (htrans_msg.type === Htrans_msg.TYPE.HKAD) {
				const msg = new Hkad_msg(htrans_msg.msg);
				this._in(msg);
			}
		} catch(err) {
			// Silently ignore it?
		}
	}

	_out(hkad_msg, node_info) {
		// Hkad_msg is delivered from an HKAD ENG module
		const htrans_msg = new Htrans_msg({
			msg: hkad_msg,
			type: Htrans_msg.TYPE.HKAD
		});

		this.trans._send(htrans_msg, node_info.addr, node_info.port);
	}
}

module.exports.Hkad_net_solo = Hkad_net_solo;