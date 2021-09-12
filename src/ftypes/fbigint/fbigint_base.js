/** 
* FBIGINT_BASE
* Base class for a big integer type
* 
* 
* 
* 
*/ 

"use strict";

class Fbigint_base {
  static JSON_TYPE = "Fbigint";
  static BYTE_SCALE_MAX = 256;

  data;

  /**
   * There's 4 ways to construct an Fbigint:
   * 1) Pass a hex string with NO SPECIAL PREFIX
   * 2) Pass a JavaScript Number
   * 3) Pass an Fbigint
   * 4) Pass null, which will create an Fbigint with null data
   * 
   * You can also construct an Fbigint using the alternate from_base2_str() constructor
   * by passing a base2 string with NO SPECIAL PREFIX. This is separated from the default 
   * constructor to avoid confusion between hex and base2 strings.
   */

  constructor(input) {
    if (typeof input === "string") {
      this.data = this._data_from_hex_str(input);
    } else if (typeof input === "number") {
      this.data = this._data_from_number(input);
    } else if (input instanceof Fbigint_base) {
      this.data = this._data_from_fbigint(input);
    } else if (input === null) {
      this.data = null;
    } else {
      throw new TypeError("Argument 'input' must be string or Number");
    }
  }

  static from_base2_str(str) {
    throw new Error("Subclasses must implement the from_base2_str() method");
  }

  static unsafe_random(byte_len) {
    throw new Error("Subclasses must implement the unsafe_random() method");
  }

  static _json_revive(key, val) {
    throw new Error("Subclasses must implement the _json_revive() method");
  }

  _data_from_hex_str(input) {
    throw new Error("Subclasses must implement the _data_from_hex_str() method");
  }

  _data_from_number(input) {
    throw new Error("Subclasses must implement the _data_from_number() method");
  }

  _data_from_fbigint(input) {
    throw new Error("Subclasses must implement the _data_from_fbigint() method");
  }

  get() {
    throw new Error("Subclasses must implement the get() method");
  }

  equals(op) {
    throw new Error("Subclasses must implement the equals() method");
  }

  greater(op) {
    throw new Error("Subclasses must implement the greater() method");
  }

  less(op) {
    throw new Error("Subclasses must implement the less() method");
  }

  greater_equal(op) {
    throw new Error("Subclasses must implement the greater_equal() method");
  }

  less_equal(op) {
    throw new Error("Subclasses must implement the less_equal() method");
  }

  add(op) {
    throw new Error("Subclasses must implement the add() method");
  }

  sub(op) {
    throw new Error("Subclasses must implement the sub() method");
  }

  and(op) {
    throw new Error("Subclasses must implement the and() method");
  }

  or(op) {
    throw new Error("Subclasses must implement the or() method");
  }

  xor(op) {
    throw new Error("Subclasses must implement the xor() method");
  }

  shift_left(op) {
    throw new Error("Subclasses must implement the shift_left() method");
  }

  shift_right(op) {
    throw new Error("Subclasses must implement the shift_right() method");
  }

  pow(op) {
    throw new Error("Subclasses must implement the pow() method");
  }

  /**
   * Transform this Fbigint to a binary string, most significant bit on the left. b is the number
   * of bits to consider, we'll pad with zeroes as required.
   */ 
  to_bin_str(b) {
    throw new Error("Subclasses must implement the to_bin_str() method");
  }

  get_bit(i) {
    throw new Error("Subclasses must implement the get_bit() method");
  }

  toString(base = 16) {
    throw new Error("Subclasses must implement the toString() method");
  }

  toJSON() {
    throw new Error("Subclasses must implement the toJSON() method");
  }
}

module.exports.Fbigint_base = Fbigint_base;