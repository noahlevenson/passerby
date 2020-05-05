const { Hstun_msg } = require("./hstun_msg.js");
const { Hstun_hdr } = require("./hstun_hdr.js");
const { Hstun_attr } = require("./hstun_attr.js");

// The Hstun class provides all STUN server and client function
// Our first crack at HSTUN is gonna be simpler than HKAD -- we're gonna skip the "NET" layer between HSTUN and HTRANS
// let's note where this is good and where it's bad...
class Hstun {
	trans;
	sw;

	constructor({trans = null, sw = false} = {}) {
		if (!(trans instanceof Htrans)) {
			throw new TypeError("Argument 'trans' must be instance of Htrans");
		}

		this.sw = sw;
		this.trans = trans;
		this.trans.network.on("message", this._decode_and_process.bind(this));
	}

	start() {
		return new Promise((resolve, reject) => {
			if (this.udp4 && this.udp6) {
				this.socket = dgram.createSocket("udp6");
			} else if (this.udp4) {
				this.socket = dgram.createSocket("udp4");
			} else {
				this.socket = dgram.createSocket({type: "udp6", ipv6Only: true});
			}

			this.socket.on("listening", () => {
				const addr = this.socket.address();
				this._lout(`Listening for STUN clients on ${addr.address}:${addr.port}\n`);
				resolve();
			});

			this.socket.on("message", this._onMessage.bind(this));
			this.socket.bind(this.port);
			this._lout(`ministun starting...\n`);
		}); 
	}

	stop() {
		return new Promise((resolve, reject) => {
			this.socket.on("close", () => {
				this._lout(`ministun stopped\n`);
				resolve();
			});

			this.socket.close();
		});
	}

	// This intermediate function is only here because we don't have a NET layer like HKAD --
	// In the protocol pattern we're establishing, each network enabled module's NET layer 
	// deals with parsing the Htrans_msg that comes in from HTRANS, and deciding whether 
	// it's a message intended for another system or if we should take action on it...
	_decode_and_process(htrans_msg) {
		
	}

	_on_message(msg, rinfo) {
		const inMsg = Hstun_msg.from(msg);

		if (inMsg === null) {
			return;
		}

		this._lout(`${Object.keys(Hstun_hdr.K_MSG_TYPE)[Hstun_hdr._decType(inMsg.hdr.type).type]} received from ${rinfo.address}:${rinfo.port}\n`);

		// For compliance with RFCs 5389 and 3489, we return an error response for any unknown comprehension required attrs
		const badAttrTypes = [];

		inMsg.attrs.forEach((attr) => {
			if (Hstun_attr._decType(attr.type).type === Hstun_attr.K_ATTR_TYPE.MALFORMED && Hstun_attr._isCompReq(attr.type)) {
				badAttrTypes.push(attr.type);
			}
		});

		if (badAttrTypes.length > 0) {
			const attrs = [
				new Hstun_attr({
					type: Hstun_attr.K_ATTR_TYPE.ERROR_CODE, 
					args: [420]
				}),
				new Hstun_attr({
					type: Hstun_attr.K_ATTR_TYPE.UNKNOWN_ATTRIBUTES, 
					args: [badAttrTypes]
				})
			];

			const outHdr = new Hstun_hdr({
				type: Hstun_hdr.K_MSG_TYPE.BINDING_ERROR_RESPONSE, 
				len: Hstun_msg._attrByteLength(attrs), 
				id: inMsg.hdr.id
			});

			const outMsg = new Hstun_msg({
				hdr: outHdr, 
				attrs: attrs
			});

			this._send(outMsg, rinfo);
		}

		if (Hstun_hdr._decType(inMsg.hdr.type).type === Hstun_hdr.K_MSG_TYPE.BINDING_REQUEST) {
			const mtype = !inMsg.rfc3489 ? Hstun_attr.K_ATTR_TYPE.XOR_MAPPED_ADDRESS : Hstun_attr.K_ATTR_TYPE.MAPPED_ADDRESS;

			const attrs = [
				new Hstun_attr({
					type: mtype, 
					args: [Hstun_attr.K_ADDR_FAMILY[rinfo.family], rinfo.address, rinfo.port, !inMsg.rfc3489, inMsg.hdr.id]
				})
			];

			if (this.sw) {
				attrs.push(new Hstun_attr({type: Hstun_attr.K_ATTR_TYPE.SOFTWARE}));
			}
			
			const outHdr = new Hstun_hdr({
				type: Hstun_hdr.K_MSG_TYPE.BINDING_SUCCESS_RESPONSE, 
				len: Hstun_msg._attrByteLength(attrs), 
				id: inMsg.hdr.id
			});

			const outMsg = new Hstun_msg({
				hdr: outHdr, 
				attrs: attrs
			});

			this._send(outMsg, rinfo);
		}
	}

	_send(stunMsgObj, rinfo) {
		this.socket.send(stunMsgObj.serialize(), rinfo.port, rinfo.address, (err) => {
			if (err) {
				this._lerr(`Socket send error (${rinfo.address}:${rinfo.port}): ${err}\n`);
			 	return;
			}

			this._lout(`${Object.keys(Hstun_hdr.K_MSG_TYPE)[Hstun_hdr._decType(stunMsgObj.hdr.type).type]} received from ${rinfo.address}:${rinfo.port}\n`);
		});
	}
}

module.exports = Ministun;