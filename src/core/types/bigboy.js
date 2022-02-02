"use strict";

/**
 * Bigboy provides an interface for working with large fixed-width unsigned integers. Since it's 
 * fixed-width, it preserves leading zeroes (unlike BigInt), and since it's based on Uint8Array, 
 * it's portable to Hermes (unlike BigInt). But also unlike BigInt, signed operations are undefined.
 */ 
class Bigboy {
  static DEFAULT_BYTE_WIDTH = 32;

  /**
   * JavaScript converts Number types to 32-bit integers before bitwise manipulation, so the 
   * behavior of the default constructor is undefined for values larger than 0xFFFFFFFF
   */ 
  constructor({len = Bigboy.DEFAULT_BYTE_WIDTH, val = 0} = {}) {
    if (!Number.isInteger(val) || len < Math.ceil(Math.log2(val + 1) / 8) || 
      val < 0 || val > 0xFFFFFFFF) {
      throw new TypeError("Argument error");
    }

    this._data = new Uint8Array(len);

    for (let i = 0; val > 0; i += 1) {
      this._data[i] = val & 0xFF;
      val >>>= 0x08;
    }
  }

  // TODO: validate the string
  static from_hex_str({len = Bigboy.DEFAULT_BYTE_WIDTH, str = "00"} = {}) {
    if (len < Math.ceil(str.length / 2)) {
      throw new RangeError("Argument error");
    }

    const bigboy = new this({len: len});

    for (let i = 0; i < str.length; i += 2) {
      const start = str.length - 2 - i;
      const end = start + 2;
      bigboy._data[i / 2] = Number(`0x${str.substring(start, end)}`);
    }

    return bigboy;
  }

  // TODO: validate the string
  static from_base2_str({len = Bigboy.DEFAULT_BYTE_WIDTH, str = "00"} = {}) {
    if (len < Math.ceil(str.length / 8)) {
      throw new RangeError("Argument error");
    }

    const bigboy = new this({len: len});

    for (let i = 0; i < str.length; i += 8) {
      const start = str.length - 8 - i;
      const end = start + 8;
      bigboy._data[i / 8] = Number(`0b${str.substring(start, end)}`);
    }

    return bigboy;
  }

  static unsafe_random(len = Bigboy.DEFAULT_BYTE_WIDTH) {
    const bigboy = new this({len: len});
    
    for (let i = 0; i < len; i += 1) {
      bigboy._data[i] = Math.floor(Math.random() * 256);
    }

    return bigboy;
  }

  equals(op) {
    if (this._data.length !== op._data.length) {
      throw new TypeError("Length mismatch");
    }

    for (let i = 0; i < this._data.length; i += 1) {
      if (this._data[i] !== op._data[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare this Bigboy to op and return the index of their most significant unequal byte (or just
   * return index 0 if all their bytes are equal)
   */ 
  _get_high_order_diff(op) {
    let i = this._data.length - 1;

    while (this._data[i] === op._data[i] && i > 0) {
      i -= 1;
    }

    return i;
  }

  greater(op) {
    if (this._data.length !== op._data.length) {
      throw new TypeError("Length mismatch");
    }

    const i = this._get_high_order_diff(op);
    return this._data[i] > op._data[i];
  }

  less(op) {
    if (this._data.length !== op._data.length) {
      throw new TypeError("Length mismatch");
    }

    const i = this._get_high_order_diff(op);
    return this._data[i] < op._data[i];
  }

  greater_equal(op) {
    if (this._data.length !== op._data.length) {
      throw new TypeError("Length mismatch");
    }

    const i = this._get_high_order_diff(op);
    return this._data[i] >= op._data[i];
  }

  less_equal(op) {
    if (this._data.length !== op._data.length) {
      throw new TypeError("Length mismatch");
    }

    const i = this._get_high_order_diff(op);
    return this._data[i] <= op._data[i];
  }

  and(op) {
    if (this._data.length !== op._data.length) {
      throw new TypeError("Length mismatch");
    }

    const bigboy = new Bigboy({len: this._data.length});

    for (let i = 0; i < this._data.length; i += 1) {
      bigboy._data[i] = this._data[i] & op._data[i];
    }

    return bigboy;
  }

  or(op) {
    if (this._data.length !== op._data.length) {
      throw new TypeError("Length mismatch");
    }

    const bigboy = new Bigboy({len: this._data.length});

    for (let i = 0; i < this._data.length; i += 1) {
      bigboy._data[i] = this._data[i] | op._data[i];
    }

    return bigboy;
  }

  xor(op) {
    if (this._data.length !== op._data.length) {
      throw new TypeError("Length mismatch");
    }

    const bigboy = new Bigboy({len: this._data.length});

    for (let i = 0; i < this._data.length; i += 1) {
      bigboy._data[i] = this._data[i] ^ op._data[i];
    }

    return bigboy;
  }

  shift_left(n_bits) {
    if (n_bits < 0) {
      throw new RangeError("Argument error");
    }

    const bigboy = new Bigboy({len: this._data.length});

    for (let i = 0; i < this._data.length; i += 1) {
      bigboy._data[i + Math.floor(n_bits / 8)] = this._data[i] << (n_bits % 8) | 
        this._data[i - 1] >> 8 - (n_bits % 8); 
    }

    return bigboy;
  }

  shift_right(n_bits) {
    if (n_bits < 0) {
      throw new RangeError("Argument error");
    }

    const bigboy = new Bigboy({len: this._data.length});

    for (let i = 0; i < this._data.length; i += 1) {
      bigboy._data[i - Math.floor(n_bits / 8)] = this._data[i] >>> (n_bits % 8) | 
        this._data[i + 1] << 8 - (n_bits % 8); 
    }
    
    return bigboy;
  }

  get_bit(idx) {
    if (idx < 0) {
      throw new RangeError("Argument error");
    }

    return this._data[Math.floor(idx / 8)] >>> (idx % 8) & 0x01; 
  }

  to_hex_str() {
    return Array.from(this._data).map(byte => byte.toString(16).padStart(2, "0")).reverse().join("");
  }

  to_base2_str() {
    return Array.from(this._data).map(byte => byte.toString(2).padStart(8, "0")).reverse().join("");
  }

  length() {
    return this._data.length;
  }
}

module.exports = { Bigboy };