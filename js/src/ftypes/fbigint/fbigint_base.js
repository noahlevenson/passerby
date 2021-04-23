/** 
* FBIGINT_BASE
* Base class for a big integer type
* Large integral values present unique challenges for arithmetic operations,
* serialization/deserialization, over-the-wire transmission, and runtime
* environment support -- FBIGINT_BASE provides a universal interface for
* various host-dependent implementations
*/ 

"use strict";

class Fbigint_base {
	static JSON_TYPE = "Fbigint";
	static BYTE_SCALE_MAX = 256;

	data;

	constructor() {
		
	}

	static from_base2_str(str) {
		throw new Error("Subclasses must implement the from_base2_str() method");
	}

	static _json_revive(key, val) {
		throw new Error("Subclasses must implement the _json_revive() method");
	}

	static unsafe_random(byte_len) {
		throw new Error("Subclasses must implement the unsafe_random() method");
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