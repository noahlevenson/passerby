"use strict";

const { read_uint16be, write_uint16be } = require("../core/uint8.js");
const { to_hex } = require("../core/crypto.js");
const { Header } = require("./header.js");
const { Data } = require("./data.js");

class Attribute {
  static ALIGN = 4;
  static SOFTWARE = "software attribute TBD";
  static TYPE_I = [0, 2]; 
  static LEN_I = [2, 4];
  static LEN_LEN = this.LEN_I[1] - this.LEN_I[0]; 
  static TYPE_LEN = this.TYPE_I[1] - this.TYPE_I[0];

  static ATTR_TYPE = {
    RESERVED_0000: 0,
    MAPPED_ADDRESS: 1,
    RESERVED_0002: 2,
    RESERVED_0003: 3,
    RESERVED_0004: 4,
    RESERVED_0005: 5,
    USERNAME: 6,
    RESERVED_0007: 7,
    MESSAGE_INTEGRITY: 8,
    ERROR_CODE: 9,
    UNKNOWN_ATTRIBUTES: 10,
    RESERVED_000B: 11,
    REALM: 12,
    NONCE: 13,
    XOR_MAPPED_ADDRESS: 14,
    SOFTWARE: 15,
    ALTERNATE_SERVER: 16,
    FINGERPRINT: 17,
    MALFORMED: 18
  };

  static ATTR_TYPE_TABLE = new Map([
    [
      to_hex(new Uint8Array([0x00, 0x00])), 
      new Data(this.ATTR_TYPE.RESERVED_0000, new Uint8Array([0x00, 0x00]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x01])), 
      new Data(this.ATTR_TYPE.MAPPED_ADDRESS, new Uint8Array([0x00, 0x01]), this._enMappedAddr)
    ],
    [
      to_hex(new Uint8Array([0x00, 0x02])), 
      new Data(this.ATTR_TYPE.RESERVED_0002, new Uint8Array([0x00, 0x02]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x03])), 
      new Data(this.ATTR_TYPE.RESERVED_0003, new Uint8Array([0x00, 0x03]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x04])), 
      new Data(this.ATTR_TYPE.RESERVED_0004, new Uint8Array([0x00, 0x04]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x05])), 
      new Data(this.ATTR_TYPE.RESERVED_0005, new Uint8Array([0x00, 0x05]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x06])), 
      new Data(this.ATTR_TYPE.USERNAME, new Uint8Array([0x00, 0x06]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x07])), 
      new Data(this.ATTR_TYPE.RESERVED_0007, new Uint8Array([0x00, 0x07]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x08])), 
      new Data(this.ATTR_TYPE.MESSAGE_INTEGRITY, new Uint8Array([0x00, 0x08]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x09])), 
      new Data(this.ATTR_TYPE.ERROR_CODE, new Uint8Array([0x00, 0x09]), this._enErrorCode)
    ],
    [
      to_hex(new Uint8Array([0x00, 0x0A])), 
      new Data(this.ATTR_TYPE.UNKNOWN_ATTRIBUTES, new Uint8Array([0x00, 0x0A]), this._enUnknownAttr)
    ],
    [
      to_hex(new Uint8Array([0x00, 0x0B])), 
      new Data(this.ATTR_TYPE.RESERVED_000B, new Uint8Array([0x00, 0x0B]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x14])), 
      new Data(this.ATTR_TYPE.REALM, new Uint8Array([0x00, 0x14]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x15])), 
      new Data(this.ATTR_TYPE.NONCE, new Uint8Array([0x00, 0x15]))
    ],
    [
      to_hex(new Uint8Array([0x00, 0x20])), 
      new Data(this.ATTR_TYPE.XOR_MAPPED_ADDRESS, new Uint8Array([0x00, 0x20]), this._enMappedAddr)
    ],
    [
      to_hex(new Uint8Array([0x80, 0x22])), 
      new Data(this.ATTR_TYPE.SOFTWARE, new Uint8Array([0x80, 0x22]), this._enSoftware)],
    [
      to_hex(new Uint8Array([0x80, 0x23])), 
      new Data(this.ATTR_TYPE.ALTERNATE_SERVER, new Uint8Array([0x80, 0x23]))
    ],
    [
      to_hex(new Uint8Array([0x80, 0x28])), 
      new Data(this.ATTR_TYPE.FINGERPRINT, new Uint8Array([0x80, 0x28]))
    ]
  ]);

  static ADDR_FAMILY = {
    IPv4: 0,
    IPv6: 1,
    MALFORMED: 2
  };

  static ADDR_FAMILY_TABLE = new Map([
    [
      to_hex(new Uint8Array([0x01])), 
      new Data(this.ADDR_FAMILY.IPv4, new Uint8Array([0x01]))
    ],
    [
      to_hex(new Uint8Array([0x02])), 
      new Data(this.ADDR_FAMILY.IPv6, new Uint8Array([0x02]))
    ]
  ]);

  static ERROR_CODE = {
    300: "Try Alternate",
    400: "Bad Request",
    401: "Unauthorized",
    420: "Unknown Attribute",
    438: "Stale Nonce",
    500: "Server Error"
  };

  // TODO: Validation
  constructor({type = null, args = []} = {}) {
    this.type = type ? Attribute._enType(type) : type;
    this.val = type ? Array.from(Attribute.ATTR_TYPE_TABLE.values())[type].f(...args) : null;
    this.len = type ? Attribute._enLen(this.val.length) : null;
  }

  // TODO: Validation
  static from({type = null, len = null, val = null} = {}) {
    const attr = new this;
    attr.type = type;
    attr.len = len;
    attr.val = val;
    return attr;
  }

  static _isCompReq(type) {
    if (!ArrayBuffer.isView(type) || type.length !== 2) {
      throw new Error("Argument error");
    }
    
    if (read_uint16be(type, 0) < 0x8000) {
      return false;
    } 

    return true;
  }

  static _decType(type) {
    if (!ArrayBuffer.isView(type) || type.length !== 2) {
      throw new Error("Argument error");
    }

    const dtype = this.ATTR_TYPE_TABLE.get(to_hex(type));

    if (dtype !== undefined) {
      return dtype;
    }
    
    return new Data(this.ATTR_TYPE.MALFORMED);
  }

  static _decLen(len) {
    if (!ArrayBuffer.isView(len) || len.length !== 2) {
      throw new Error("Argument error");
    }

    return read_uint16be(len, 0);
  }

  static _decFam(fam) {
    if (!ArrayBuffer.isView(fam) || fam.length !== 1) {
      throw new Error("Argument error");
    }

    const dfam = this.ADDR_FAMILY_TABLE.get(to_hex(fam));

    if (dfam !== undefined) {
      return dfam;
    }

    return new Data(this.ADDR_FAMILY.MALFORMED);
  }

  static _enType(type) {
    if (typeof type !== "number") {
      throw new Error("Argument error");
    }

    const tdata = Array.from(this.ATTR_TYPE_TABLE.values())[type];

    if (!tdata) {
      throw new Error(`Invalid value for type: ${type}`);
    }

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

  static _enFam(fam) {
    if (typeof fam !== "number") {
      throw new Error("Argument error");
    }

    const tdata = Array.from(this.ADDR_FAMILY_TABLE.values())[fam];

    if (!tdata) {
      throw new Error(`Invalid value for fam: ${fam}`);
    }

    return new Uint8Array(tdata.bin);
  }

  // TODO: Validation
  static _enMappedAddr(famType, addrStr, portInt, xor = false, id = new Uint8Array(12)) {
    const zero = new Uint8Array(1);
    const fam = Attribute._enFam(famType);
    const port = new Uint8Array(2);
    write_uint16be(portInt, port, 0);
    let addr;

    if (famType === Attribute.ADDR_FAMILY.IPv4) {
      addr = Attribute._ipv4_string_to_binary(addrStr);
    } else if (famType === Attribute.ADDR_FAMILY.IPv6) {
      addr = Attribute._ipv6_string_to_binary(addrStr);
    }

    if (xor) {
      for (let i = 0; i < port.length; i += 1) {
        port[i] ^= Header.MAGIC[i]; 
      }

      const c = new Uint8Array([...Header.MAGIC, ...id]);

      for (let i = 0; i < addr.length; i += 1) {
        addr[i] ^= c[i];
      }
    }

    return new Uint8Array([...zero, ...fam, ...port, ...addr]);
  }
  
  // TODO: this is noob rating 10/10
  static _decMappedAddr(buf, id, xor = false) {
    const famType = Attribute._decFam(buf.slice(1, 2));
    const port = buf.slice(2, 4);
    const addr = buf.slice(4, buf.length);

    if (xor) {
      for (let i = 0; i < port.length; i += 1) {
        port[i] ^= Header.MAGIC[i];
      }

      const c = new Uint8Array([...Header.MAGIC, ...id]);

      for (let i = 0; i < addr.length; i += 1) {
        addr[i] ^= c[i];
      }
    }
        
    let decoded_addr;

    if (famType.type === Attribute.ADDR_FAMILY.IPv4) {
      decoded_addr = Attribute._binary_to_ipv4_string(addr);
    } else if (famType.type === Attribute.ADDR_FAMILY.IPv6) {
      decoded_addr = Attribute._binary_to_ipv6_string(addr);
    }

    return [decoded_addr, read_uint16be(port, 0)];
  }

  // TODO: Validation
  static _enErrorCode(code) {
    const resClass = new Uint8Array(3);
    resClass[2] = Math.floor(code / 100);
    
    const num = new Uint8Array([code % 100]);
    const phrase = new TextEncoder().encode(Attribute.ERROR_CODE[code]);
    return new Uint8Array([...resClass, ...num, ...phrase]);
  }

  // TODO: Validation
  static _enUnknownAttr(types) {
    const unknowns = types.map(type => new Uint8Array(type));
    const buf = new Uint8Array(unknowns.length * Attribute.TYPE_LEN);

    for (let i = 0; i < buf.length; i += Attribute.TYPE_LEN) {
      buf.set(unknowns[i], i);
    }

    return Attribute._toPadded(buf);
  }

  static _enSoftware(desc = Attribute.SOFTWARE) {
    return Attribute._toPadded(new TextEncoder().encode(desc));
  } 

  static _toPadded(buf) {
    return new Uint8Array([
      ...buf, 
      ...new Uint8Array(Math.ceil(buf.length / Attribute.ALIGN) * Attribute.ALIGN - buf.length)
    ]);
  }

  static _ipv4_string_to_binary(string) {
    return new Uint8Array(string.split(".").map(n => parseInt(n)));
  }

  static _binary_to_ipv4_string(buf) {
    return `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}`;
  }

  static _ipv6_string_to_binary(string) {
    throw new Error("Congratulations! You've discovered the missing _ipv6_string_to_binary " + 
      "implementation");
  }

  static _binary_to_ipv6_string(buf) {
    throw new Error("Congratulations! You've discovered the missing _binary_to_ipv6_string " + 
      "implementation");
  }

  length() {
    return (this.type.length + this.len.length + this.val.length);
  }

  serialize() {
    return new Uint8Array([...this.type, ...this.len, ...this.val]);
  }
}

module.exports = { Attribute };