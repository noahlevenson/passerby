/** 
* FBIGINT_NODE
* Implementation of the Fbigint interface for Node.js >= 12.?
* Uses native BigInt under the hood
* 
* 
* 
*/ 

"use strict";

const { Fbigint_base } = require("./fbigint_base.js");

class Fbigint extends Fbigint_base {
  constructor(input) {
    super(input);
  }

  static from_base2_str(str) {
    const fbigint = new this(null);
    fbigint.data = BigInt(`0b${str}`);
    return fbigint;
  }

  static unsafe_random(byte_len) {
    const rnds = Array(byte_len).fill().map(() => Math.floor(Math.random() * Fbigint.BYTE_SCALE_MAX));
    return new Fbigint(Buffer.from(rnds).toString("hex"));
  }

  static _json_revive(key, val) {
    if (typeof val === "object" && val !== null && val.type === Fbigint_base.JSON_TYPE) {
      return new Fbigint(val.data);
    }

    return val;
  }

  _data_from_hex_str(input) {
    return BigInt(`0x${input}`);
  }

  _data_from_number(input) {
    return BigInt(input);
  }

  _data_from_fbigint(input) {
    return BigInt(input.data);
  }

  get() {
    return this.data;
  }

  equals(op) {
    return this.data === op.get();
  }

  greater(op) {
    return this.data > op.get();
  }

  less(op) {
    return this.data < op.get();
  }

  greater_equal(op) {
    return this.data >= op.get();
  }

  less_equal(op) {
    return this.data <= op.get();
  }

  add(op) {
    return new Fbigint((this.data + op.get()).toString(16));
  }

  sub(op) {
    return new Fbigint((this.data - op.get()).toString(16));
  }

  and(op) {
    return new Fbigint((this.data & op.get()).toString(16));
  }

  or(op) {
    return new Fbigint((this.data | op.get()).toString(16));
  }

  xor(op) {
    return new Fbigint((this.data ^ op.get()).toString(16));
  }

  shift_left(op) {
    return new Fbigint((this.data << op.get()).toString(16));
  }

  shift_right(op) {
    return new Fbigint((this.data >> op.get()).toString(16));
  }

  pow(op) {
    return new Fbigint((this.data ** op.get()).toString(16));
  }

  to_bin_str(b) {
    return this.data.toString(2).padStart(b, "0");
  }

  get_bit(i) {
    const mask = BigInt(0x01) << BigInt(i);
    return (this.data & mask) > BigInt(0) ? 1 : 0;
  }

  toString(base = 16) {
    return this.data.toString(base);
  }

  toJSON() {
    return {
      type: Fbigint_base.JSON_TYPE,
      data: this.data.toString(16)
    };
  }
}

module.exports.Fbigint = Fbigint;