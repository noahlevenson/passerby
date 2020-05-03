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
		// This htrans_msg is delivered from the HTRANS module, so it's an Htrans object where the msg is a Buffer
		// TODO: Need to figure out how to discern HKAD messages if/when we multiplex protocols
		// How do we know that htrans_msg.msg is a buffer that we should try to stringify and parse using the bigint reviver function?
		// maybe we have to try to transform it this way to learn that it's not actually an Hkad_msg object, but we need
		// a rigorous way of testing whether some object is an Hkad_msg object...
		// A SIMPLE way to do it: Make Htrans_msg our over-the-wire format -- only send Htrans_msg's, and give them a TYPE field: KAD or STUN
		try {
			const msg = new Hkad_msg(JSON.parse(htrans_msg.msg.toString(), Hutil._bigint_revive));
			this._in(msg);
		} catch(err) {
			// Silently ignore it?
		}
	}

	_out(hkad_msg, node_info) {
		// Hkad_msg is delivered from an HKAD ENG module
		const htrans_msg = new Htrans_msg({
			msg: Buffer.from(JSON.stringify(hkad_msg)),
			addr: node_info.addr,
			fam: null,
			port: node_info.port,
			size: null
		});

		this.trans._send(htrans_msg);
	}
}

module.exports.Hkad_net_solo = Hkad_net_solo;