/** 
* FBIGINT_NODE
* Implementation of the FBIGINT_BASE interface for Node.js >= 12.?
* It uses native BigInt under the hood
* 
* 
* 
*/ 

"use strict";

const { Fbigint_base } = require("./fbigint_base.js");

class Fbigint extends Fbigint_base {
	// Using the default constructor, an Fbigint can be constructed from a base16 string, a Number, or another Fbigint -- that's it
	constructor(input) {
		super();
		
		if (typeof input === "string") {
			this.data = BigInt(`0x${input}`);
		} else if (typeof input === "number") {
			this.data = BigInt(input);
		} else if (input instanceof Fbigint) {
			this.data = BigInt(input.data);
		} else if (input === null) {
			// Special case - passing null will let you create an Fbigint with a null data
			this.data = null;
		} else {
			throw new TypeError("Argument 'input' must be string or Number");
		}
	}

	// Alternate constructor to create an Fbigint from a base2 (binary) string
	// We don't include this in the default constructor because I think it's more confusing 
	// and brittle to parse multiple kinds of string encoded data based on an 0x or 0b prefix
	static from_base2_str(str) {
		const fbigint = new this(null);
		fbigint.data = BigInt(`0b${str}`);
		return fbigint;
	}

	static _json_revive(key, val) {
		if (typeof val === "object" && val.type === Fbigint_base.JSON_TYPE) {
			return new Fbigint(val.data);
		}

		return val;
	}

	static unsafe_random(byte_len) {
		const rnd_vals = Array(byte_len).fill().map(() => Math.floor(Math.random() * Fbigint.BYTE_SCALE_MAX));
		return new Fbigint(Buffer.from(rnd_vals).toString("hex"));
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

	// Get binary string representation of this Fbigint, leftmost bit is MSB
	// b is the number of bits to consider -- it adds trailing '0' bits 
	to_bin_str(b) {
		if (!b) {
			throw new Error("Must supply value for 'b'")
		}

		return this.data.toString(2).padEnd(b, "0");
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