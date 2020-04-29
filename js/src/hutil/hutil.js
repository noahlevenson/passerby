const crypto = require("crypto");

// Utility functions
class Hutil {
	static SYS_BYTE_WIDTH = 8;

	// Returns a hex string
	static _sha1(data) {
		const hash = crypto.createHash("SHA1"); // TODO: this encoding string is host dependent, 'openssl list -digest-algorithms'
		hash.update(data);
		return hash.digest("hex");
	}

	// This is actually only returning the integer part of the log2, right?
	static _log2(n) {
		let x = BigInt(n);

		if (x === BigInt(0)) {
			return 0;
		}
		
		let y = BigInt(1);
		let i = 0;

		while (x > 0) {
			x >>= y;
			i += 1
		}

		return i - 1;
	}

	// Sort elements in array arr by their euclidean distance from number n
	static _sort_by_distance_from(arr, n) {
		return arr.sort((a, b) => {
			return Math.abs(a - n) - Math.abs(b - n);
		});
	}

	// Normalize positive float f to an integer of bit depth b, where fmax is the largest possible value of f
	// Currently returns a Number, but we may want to instead roll our own Buffer-based binary format
	// The reason we don't just return a BigInt is because we can't multiply a float by a BigInt
	// TODO: Currently appears safe for the range we need for lat/long, but it's undefined and may overflow for other use cases!
	static _float_to_normalized_int(f, fmax, b) {
		// TODO: Validate inputs and make sure we won't overflow!
		const max = (Math.pow(2, b) - 1) / fmax;
		return Math.floor(f * max);
	}

	// Get 2D Z-curve linearization for positive values x and y, where b is the bit depth of each dimension
	// Currently takes Number types and returns a BigInt, but we may want to roll our own Buffer-based binary format
	static _z_linearize_2d(x, y, b) {
		// TODO: Validate inputs
		let xx = BigInt(x);
		let yy = BigInt(y);

		let l = 0n;
		let mask = 0x01n;

		for (let i = 0; i < b; i += 1) {
			l |= (xx & mask) << BigInt(i);
			l |= (yy & mask) << BigInt(i + 1);
			mask <<= 0x01n;
		}

		return l;
	}

	// Get binary string representation of a BigInt, leftmost bit is LSB
	// b is the number of bits to consider -- it adds trailing '0' bits
	// because we want 0 and 000 to be different strings for our PHT labels
	static _bigint_to_bin_str(n, b) {
		// TODO: validation
		return n.toString(2).split("").reverse().join("").padEnd(b, "0");
	}
}

module.exports.Hutil = Hutil;