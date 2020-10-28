/** 
* HBIGINT_BROWSER
* Implementation of the HBIGINT_BASE interface for the browser (and React Native) environment
* It uses BigInteger.js under the hood: https://www.npmjs.com/package/big-integer
* 
* 
* 
*/ 

"use strict";

const BigInt = require("big-integer");
const crypto = require("crypto");
const { Hbigint_base } = require("./hbigint_base.js");

class Hbigint extends Hbigint_base {
	// Using the default constructor, an Hbigint can be constructed from a base16 string, a Number, or another Hbigint -- that's it
	constructor(input) {
		super();
		
		if (typeof input === "string") {
			this.data = BigInt(input, 16);
		} else if (typeof input === "number") {
			this.data = BigInt(input);
		} else if (input instanceof Hbigint) {
			this.data = BigInt(input.data);
		} else if (input === null) {
			// Special case - passing null will let you create an Hbigint with a null data
			this.data = null;
		} else {
			throw new TypeError("Argument 'input' must be string or Number");
		}
	}

	// Alternate constructor to create an Hbigint from a base2 (binary) string
	// We don't include this in the default constructor because I think it's more confusing 
	// and brittle to parse multiple kinds of string encoded data based on an 0x or 0b prefix
	static from_base2_str(str) {
		const hbigint = new this(null);
		hbigint.data = BigInt(str, 2);
		return hbigint;
	}

	static _json_revive(key, val) {
		if (typeof val === "string" && val.substring(0, Hbigint.JSON_PREFIX.length) === Hbigint.JSON_PREFIX) {
			return new Hbigint(val.substring(Hbigint.JSON_PREFIX.length, val.length));
		}

		return val;
	}

	static random(len) {
		return new Hbigint(crypto.randomBytes(len).toString("hex"));
	}

	get() {
		return this.data;
	}

	equals(op) {
		return this.data.equals(op.get());
	}

	greater(op) {
		return this.data.greater(op.get());
	}

	less(op) {
		return this.data.lesser(op.get());
	}

	greater_equal(op) {
		return this.data.greaterOrEquals(op.get());
	}

	less_equal(op) {
		return this.data.lesserOrEquals(op.get());
	}

	add(op) {
		return new Hbigint((this.data.add(op.get())).toString(16));
	}

	sub(op) {
		return new Hbigint((this.data.subtract(op.get())).toString(16));
	}

	and(op) {
		return new Hbigint((this.data.and(op.get())).toString(16));
	}

	or(op) {
		return new Hbigint((this.data.or(op.get())).toString(16));
	}

	xor(op) {
		return new Hbigint((this.data.xor(op.get())).toString(16));
	}

	shift_left(op) {
		return new Hbigint((this.data.shiftLeft(op.get())).toString(16));
	}

	shift_right(op) {
		return new Hbigint((this.data.shiftRight(op.get())).toString(16));
	}

	pow(op) {
		return new Hbigint((this.data.pow(op.get())).toString(16));
	}

	// Get binary string representation of this Hbigint, leftmost bit is MSB
	// b is the number of bits to consider -- it adds trailing '0' bits 
	to_bin_str(b) {
		return this.data.toString(2).padEnd(b, "0");
	}

	// TODO: This really needs to be tested
	get_bit(i) {
		const mask = BigInt(0x01).shiftLeft(BigInt(i));
		return (this.data.and(mask)).greater(BigInt(0)) ? 1 : 0;
	}

	toString(base = 16) {
		return this.data.toString(base);
	}

	toJSON() {
		return `${Hbigint.JSON_PREFIX}${this.data.toString(16)}`;
	}
}

module.exports.Hbigint = Hbigint;