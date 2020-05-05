/**
 * ministun: Zero dependency STUN server for Node.js
 *
 * by Noah Levenson <noahlevenson@gmail.com>
 * 
 * mmsg.js 
 * STUN message
 */

const { MStunHeader } = require("./mhdr.js");
const { MStunAttr } = require("./mattr.js");
const { MUtil } = require("./mutil.js"); 

class MStunMsg {
	constructor({hdr = null, attrs = [], rfc3489 = false} = {}) {
		this.hdr = hdr;
		this.attrs = attrs;
		this.rfc3489 = rfc3489;
	}

	static from(buf) {
		if (!Buffer.isBuffer(buf) || buf.length < MStunHeader.K_HDR_LEN || !MStunHeader._isValidMsb(buf)) {
			return null;
		}

		const type = buf.slice(MStunHeader.K_TYPE_OFF[0], MStunHeader.K_TYPE_OFF[1]);

		if (MStunHeader._decType(type).type === MStunHeader.K_MSG_TYPE.MALFORMED) {
			return null;
		}

		const len = buf.slice(MStunHeader.K_LEN_OFF[0], MStunHeader.K_LEN_OFF[1]);

		// Attributes are padded to multiples of 4 bytes, so the 2 least significant bits of the msg length must be zero
		if (MUtil._getBit(len, len.length - 1, 0) !== 0 || MUtil._getBit(len, len.length - 1, 1) !== 0) {
			return null;
		}
		
		const msglen = MStunHeader._decLen(len);

		if (msglen !== buf.length - MStunHeader.K_HDR_LEN) {
			return null;
		}

		const attrs = [];

		if (msglen > 0) {
			let attrptr = MStunHeader.K_HDR_LEN;

			while (attrptr < buf.length) {
				const atype = buf.slice(attrptr + MStunAttr.K_TYPE_OFF[0], attrptr + MStunAttr.K_TYPE_OFF[1]);
				const alen = buf.slice(attrptr + MStunAttr.K_LEN_OFF[0], attrptr + MStunAttr.K_LEN_OFF[1]);
				const vlen = MStunAttr._decLen(alen);
				const aval = buf.slice(attrptr + MStunAttr.K_LEN_OFF[1], attrptr + MStunAttr.K_LEN_OFF[1] + vlen);
				attrs.push(MStunAttr.from(atype, alen, aval));
				attrptr += (vlen + MStunAttr.K_TYPE_LEN + MStunAttr.K_LEN_LEN);
			}
		}

		const id = buf.slice(MStunHeader.K_ID_OFF[0], MStunHeader.K_ID_OFF[1]);
		const magic = buf.slice(MStunHeader.K_MAGIC_OFF[0], MStunHeader.K_MAGIC_OFF[1]);
		
		const msg = new this({
			hdr: MStunHeader.from({type: type, len: len, id: id, magic: magic}),
			attrs: attrs,
			rfc3489: !MStunHeader._isValidMagic(magic)
		});

		return msg;
	}

	// TODO: Validation
	static _attrByteLength(attrs) {
		return attrs.reduce((sum, attr) => {
			return sum + attr.length();
		}, 0);
	}

	serialize() {
		return Buffer.concat([this.hdr.serialize(), Buffer.concat(this.attrs.map((attr) => { 
			return attr.serialize(); 
		}))]);
	}
}

module.exports.MStunMsg = MStunMsg;