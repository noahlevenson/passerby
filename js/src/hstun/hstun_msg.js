const { Hstun_hdr } = require("./hstun_hdr.js");
const { Hstun_attr } = require("./hstun_attr.js");
const { Hutil } = require("../hutil/hutil.js"); 

class Hstun_msg {
	constructor({hdr = null, attrs = [], rfc3489 = false} = {}) {
		this.hdr = hdr;
		this.attrs = attrs;
		this.rfc3489 = rfc3489;
	}

	static from(buf) {
		if (!Buffer.isBuffer(buf) || buf.length < Hstun_hdr.K_HDR_LEN || !Hstun_hdr._isValidMsb(buf)) {
			return null;
		}

		const type = buf.slice(Hstun_hdr.K_TYPE_OFF[0], Hstun_hdr.K_TYPE_OFF[1]);

		if (Hstun_hdr._decType(type).type === Hstun_hdr.K_MSG_TYPE.MALFORMED) {
			return null;
		}

		const len = buf.slice(Hstun_hdr.K_LEN_OFF[0], Hstun_hdr.K_LEN_OFF[1]);

		// Attributes are padded to multiples of 4 bytes, so the 2 least significant bits of the msg length must be zero
		if (Hutil._getBit(len, len.length - 1, 0) !== 0 || Hutil._getBit(len, len.length - 1, 1) !== 0) {
			return null;
		}
		
		const msglen = Hstun_hdr._decLen(len);

		if (msglen !== buf.length - Hstun_hdr.K_HDR_LEN) {
			return null;
		}

		const attrs = [];

		if (msglen > 0) {
			let attrptr = Hstun_hdr.K_HDR_LEN;

			while (attrptr < buf.length) {
				const atype = buf.slice(attrptr + Hstun_attr.K_TYPE_OFF[0], attrptr + Hstun_attr.K_TYPE_OFF[1]);
				const alen = buf.slice(attrptr + Hstun_attr.K_LEN_OFF[0], attrptr + Hstun_attr.K_LEN_OFF[1]);
				const vlen = Hstun_attr._decLen(alen);
				const aval = buf.slice(attrptr + Hstun_attr.K_LEN_OFF[1], attrptr + Hstun_attr.K_LEN_OFF[1] + vlen);

				attrs.push(Hstun_attr.from({type: atype, len: alen, val: aval}));
				attrptr += (vlen + Hstun_attr.K_TYPE_LEN + Hstun_attr.K_LEN_LEN);
			}
		}

		const id = buf.slice(Hstun_hdr.K_ID_OFF[0], Hstun_hdr.K_ID_OFF[1]);
		const magic = buf.slice(Hstun_hdr.K_MAGIC_OFF[0], Hstun_hdr.K_MAGIC_OFF[1]);
		
		const msg = new this({
			hdr: Hstun_hdr.from({type: type, len: len, id: id, magic: magic}),
			attrs: attrs,
			rfc3489: !Hstun_hdr._isValidMagic(magic)
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

module.exports.Hstun_msg = Hstun_msg;