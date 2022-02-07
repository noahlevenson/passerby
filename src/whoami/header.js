"use strict";

const { to_hex } = require("../core/crypto.js");
const { compare, get_bit, read_uint16be, write_uint16be } = require("../core/uint8.js");
const { Data } = require("./data.js"); 

class Header {
  static HDR_LEN = 20;
  static ID_LEN = 12;
  static MAGIC = new Uint8Array([0x21, 0x12, 0xA4, 0x42]);
  static MAGIC_I = [4, 8];
  static TYPE_I = [0, 2];
  static ID_I = [8, 20];
  static LEN_I = [2, 4];

  static MSG_TYPE = {
    BINDING_REQUEST: 0,     
    BINDING_INDICATION: 1,   
    BINDING_SUCCESS_RESPONSE: 2,
    BINDING_ERROR_RESPONSE: 3,
    MALFORMED: 4
  };

  static MSG_TYPE_TABLE = new Map([
    [
      to_hex(new Uint8Array([0x00, 0x01])), 
      new Data(this.MSG_TYPE.BINDING_REQUEST, new Uint8Array([0x00, 0x01]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x11])), 
      new Data(this.MSG_TYPE.BINDING_INDICATION, new Uint8Array([0x00, 0x11]))
    ],
    [
      to_hex(new Uint8Array([0x01, 0x01])), 
      new Data(this.MSG_TYPE.BINDING_SUCCESS_RESPONSE, new Uint8Array([0x01, 0x01]))
    ],
    [
      to_hex(new Uint8Array([0x01, 0x11])), 
      new Data(this.MSG_TYPE.BINDING_ERROR_RESPONSE, new Uint8Array([0x01, 0x11]))
    ]
  ]);

  // TODO: Validation
  constructor({type = null, len = null, id = null, magic = Header.MAGIC} = {}) {
    this.type = typeof type === "number" ? Header._enType(type) : type;
    this.len = typeof len === "number" ? Header._enLen(len) : len;
    this.magic = Uint8Array.from(magic);
    this.id = ArrayBuffer.isView(id) ? Uint8Array.from(id) : id;
  }

  // TODO: Validation
  static from({type = null, len = null, id = null, magic = Header.MAGIC} = {}) {
    const hdr = new this;
    hdr.type = type;
    hdr.len = len;
    hdr.magic = magic;
    hdr.id = id;
    return hdr;
  }

  static _isValidMsb(buf) {
    if (!ArrayBuffer.isView(buf) || buf.length < 1) {
      throw new Error("Argument error");
    }

    if (get_bit(buf, 0, 6) || get_bit(buf, 0, 7)) {
      return false;
    }

    return true;
  }

  static _isValidMagic(magic) {
    return compare(magic, this.MAGIC);
  }

  static _decType(type) {
    if (!ArrayBuffer.isView(type) || type.length !== 2) {
      throw new Error("Argument error");
    }

    const dtype = this.MSG_TYPE_TABLE.get(to_hex(type));

    if (dtype !== undefined) {
      return dtype;
    }
    
    return new Data(this.MSG_TYPE.MALFORMED);
  }

  static _decLen(len) {
    if (!ArrayBuffer.isView(len) || len.length !== 2) {
      throw new Error("Argument error");
    }

    return read_uint16be(len, 0);
  }

  static _enType(type) {
    if (typeof type !== "number") {
      throw new Error("Argument error");
    }

    const tdata = Array.from(this.MSG_TYPE_TABLE.values())[type];
    return new Uint8Array(tdata.bin);
  }

  static _enLen(len) {
    if (typeof len !== "number") {
      throw new Error("Argument error");
    }

    const buf = new Uint8Array(2);
    write_uint16be(len, buf, 0);
    return buf;
  }

  serialize() {
    return new Uint8Array([...this.type, ...this.len, ...this.magic, ...this.id]);
  }
}

module.exports = { Header };