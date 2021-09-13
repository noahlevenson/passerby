/** 
* FSTUN_MSG
* STUN message
* 
* 
* 
* 
*/ 

"use strict";

const { Fstun_hdr } = require("./fstun_hdr.js");
const { Fstun_attr } = require("./fstun_attr.js");
const { Futil } = require("../futil/futil.js"); 

class Fstun_msg {
  constructor({hdr = null, attrs = [], rfc3489 = false} = {}) {
    this.hdr = hdr;
    this.attrs = attrs;
    this.rfc3489 = rfc3489;
  }

  static from(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < Fstun_hdr.K_HDR_LEN || !Fstun_hdr._isValidMsb(buf)) {
      return null;
    }

    const type = buf.slice(Fstun_hdr.K_TYPE_OFF[0], Fstun_hdr.K_TYPE_OFF[1]);

    if (Fstun_hdr._decType(type).type === Fstun_hdr.K_MSG_TYPE.MALFORMED) {
      return null;
    }

    const len = buf.slice(Fstun_hdr.K_LEN_OFF[0], Fstun_hdr.K_LEN_OFF[1]);

    // Attributes are padded to multiples of 4 bytes, so the 2 LSBs of the msg length must be 0
    if (Futil.get_bit(len, len.length - 1, 0) || Futil.get_bit(len, len.length - 1, 1)) {
      return null;
    }
    
    const msglen = Fstun_hdr._decLen(len);

    if (msglen !== buf.length - Fstun_hdr.K_HDR_LEN) {
      return null;
    }

    const attrs = [];

    if (msglen > 0) {
      let attrptr = Fstun_hdr.K_HDR_LEN;

      while (attrptr < buf.length) {
        const atype = buf.slice(attrptr + Fstun_attr.K_TYPE_OFF[0], attrptr + Fstun_attr.K_TYPE_OFF[1]);
        const alen = buf.slice(attrptr + Fstun_attr.K_LEN_OFF[0], attrptr + Fstun_attr.K_LEN_OFF[1]);
        const vlen = Fstun_attr._decLen(alen);
        const aval = buf.slice(attrptr + Fstun_attr.K_LEN_OFF[1], attrptr + Fstun_attr.K_LEN_OFF[1] + vlen);

        attrs.push(Fstun_attr.from({type: atype, len: alen, val: aval}));
        attrptr += (vlen + Fstun_attr.K_TYPE_LEN + Fstun_attr.K_LEN_LEN);
      }
    }

    const id = buf.slice(Fstun_hdr.K_ID_OFF[0], Fstun_hdr.K_ID_OFF[1]);
    const magic = buf.slice(Fstun_hdr.K_MAGIC_OFF[0], Fstun_hdr.K_MAGIC_OFF[1]);
    
    const msg = new this({
      hdr: Fstun_hdr.from({type: type, len: len, id: id, magic: magic}),
      attrs: attrs,
      rfc3489: !Fstun_hdr._isValidMagic(magic)
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
    return Buffer.concat([this.hdr.serialize(), Buffer.concat(this.attrs.map(attr => attr.serialize()))]);
  }
}

module.exports.Fstun_msg = Fstun_msg;