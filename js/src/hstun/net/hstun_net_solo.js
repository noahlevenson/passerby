const { Hstun_net } = require("../hstun_net.js");
const { Htrans } = require("../../htrans/htrans.js");
const { Htrans_msg } = require("../../htrans/htrans_msg.js");

// Hstun_net_solo is an HSTUN network module that uses exactly one HTRANS transport
class Hstun_net_solo extends Hstun_net {
	trans;

	constructor(trans) {
		super();

		if (!(trans instanceof Htrans)) {
			throw new TypeError("Argument 'trans' must be instance of Htrans");
		}

		this.trans = trans;
		this.trans.network.on("message", this._on_message.bind(this));
	}

	// Currently, HTRANS_UDP emits the rinfo object as a second argument. HKAD ignores it, and HSTUN listens for it
	// TODO: In the future, we prob want to roll our own generalized "remote info" data type, because, for example,
	// I'm not sure if Node's TCP implementation provides rinfo objects -- so an HTRANS_TCP might not be able to supply an rinfo 
	// in the same way as HTRANS_UDP, and we lose all the generality...
	_on_message(htrans_msg, rinfo) {
		// This htrans_msg is delivered from the HTRANS module, so it's a rehydrated Htrans object
		// HTRANS guarantees that this is a valid HTRANS object, but we need to know if it's of the HSTUN type...
		// Since an HSTUN message is a binary Buffer, we don't validate it here -- it'll get validated or discarded by the HSTUN module
		try {
			if (htrans_msg.type === Htrans_msg.TYPE.HSTUN) {
				this._in(Buffer.from(htrans_msg.msg), rinfo);
			}
		} catch(err) {
			// Silently ignore it?
		}
	}

	_out(msg, rinfo) {
		// msg is a STUN message delivered from HSTUN
		const htrans_msg = new Htrans_msg({
			msg: msg,
			type: Htrans_msg.TYPE.HSTUN
		});

		this.trans._send(htrans_msg, rinfo.address, rinfo.port);
	}
}

module.exports.Hstun_net_solo = Hstun_net_solo;