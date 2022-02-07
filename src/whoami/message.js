"use strict";

const { get_bit } = require("../core/uint8.js");
const { Header } = require("./header.js");
const { Attribute } = require("./attribute.js");

class Message {
  constructor({hdr = null, attrs = [], rfc3489 = false} = {}) {
    this.hdr = hdr;
    this.attrs = attrs;
    this.rfc3489 = rfc3489;
  }

  static from(buf) {
    if (!ArrayBuffer.isView(buf) || buf.length < Header.HDR_LEN || !Header._isValidMsb(buf)) {
      return null;
    }

    const type = buf.slice(Header.TYPE_I[0], Header.TYPE_I[1]);

    if (Header._decType(type).type === Header.MSG_TYPE.MALFORMED) {
      return null;
    }

    const len = buf.slice(Header.LEN_I[0], Header.LEN_I[1]);

    // Attributes are padded to multiples of 4 bytes, so the 2 LSBs of the msg length must be 0
    if (get_bit(len, len.length - 1, 0) || get_bit(len, len.length - 1, 1)) {
      return null;
    }
    
    const msglen = Header._decLen(len);

    if (msglen !== buf.length - Header.HDR_LEN) {
      return null;
    }

    const attrs = [];

    if (msglen > 0) {
      let attrptr = Header.HDR_LEN;

      while (attrptr < buf.length) {
        const atype = buf.slice(attrptr + Attribute.TYPE_I[0], attrptr + Attribute.TYPE_I[1]);
        const alen = buf.slice(attrptr + Attribute.LEN_I[0], attrptr + Attribute.LEN_I[1]);
        const vlen = Attribute._decLen(alen);
        const aval = buf.slice(attrptr + Attribute.LEN_I[1], attrptr + Attribute.LEN_I[1] + vlen);
        attrs.push(Attribute.from({type: atype, len: alen, val: aval}));
        attrptr += (vlen + Attribute.TYPE_LEN + Attribute.LEN_LEN);
      }
    }

    const id = buf.slice(Header.ID_I[0], Header.ID_I[1]);
    const magic = buf.slice(Header.MAGIC_I[0], Header.MAGIC_I[1]);
    
    const msg = new this({
      hdr: Header.from({type: type, len: len, id: id, magic: magic}),
      attrs: attrs,
      rfc3489: !Header._isValidMagic(magic)
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
    const attrs = this.attrs.map(attr => attr.serialize());
    const attrs_buf = new Uint8Array(Message._attrByteLength(this.attrs));

    let i = 0;
    let ptr = 0;

    while (i < attrs.length) {
      attrs_buf.set(attrs[i], ptr);
      ptr += attrs[i].length;
      i += 1;
    }

    return new Uint8Array([...this.hdr.serialize(), ...attrs_buf]);
  }
}

module.exports = { Message };