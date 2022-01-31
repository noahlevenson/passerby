"use strict";

/**
 * Bigboy provides an interface for working with large fixed-width unsigned integers. Since it's 
 * fixed-width, it preserves leading zeroes (unlike BigInt), and since it's based on Uint8Array, 
 * it's portable to Hermes (unlike BigInt). But also unlike BigInt, signed operations are undefined.
 */ 
class Bigboy {
  constructor({len = 32, val = 0} = {}) {
    if (!Number.isInteger(val) || len < Math.log2(val) / 8 || val < 0) {
      throw new TypeError("Argument error");
    }

    this._data = new Uint8Array(len);

    for (let i = 0; val > 0; i += 1) {
      this._data[i] = val & 0xFF;
      val >>>= 0x08;
    }
  }

  static from_hex_str({len = 32, str = "00"} = {}) {
    if (len < str.length / 2) {
      throw new TypeError("Argument error");
    }

    const bigboy = new this();

    for (let i = 0; i < str.length; i += 2) {
      const start = str.length - 2 - i;
      const end = start + 2;
      bigboy._data[i / 2] = Number(`0x${str.substring(start, end)}`);
    }

    return bigboy;
  }

  static from_base2_str({len = 32, str = "00"} = {}) {
    if (len < str.length / 8) {
      throw new TypeError("Argument error");
    }

    const bigboy = new this();

    for (let i = 0; i < str.length; i += 8) {
      const start = str.length - 8 - i;
      const end = start + 8;
      bigboy._data[i / 8] = Number(`0b${str.substring(start, end)}`);
    }

    return bigboy;
  }

  to_hex_str() {
    return Array.from(this._data).map(byte => byte.toString(16).padStart(2, "0")).reverse().join("");
  }

  to_base2_str() {
    return Array.from(this._data).map(byte => byte.toString(2).padStart(8, "0")).reverse().join("");
  }
}

module.exports = Bigboy;