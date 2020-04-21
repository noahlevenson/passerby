// Utility functions
class Hutil {
	static SYS_BYTE_WIDTH = 8;

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

	// Comparator function to sort elements in array arr by their euclidean distance from number n
	static _sort_by_distance_from(arr, n) {
		return arr.sort((a, b) => {
			return Math.abs(a - n) - Math.abs(b - n);
		});
	}

	// Normalize float f to an integer of bit depth b
	// Currently returns a Number, but we may want to instead roll our own Buffer-based binary format
	// This appears safe for the range we need for lat/long, but it's undefined and may overflow for other use cases!
	static _float_to_normalized_int(f, b) {
		// Slow bad way to make our inputs won't overflow -- we basically do the math twice
		if (BigInt(Math.ceil(f)) * (2n ** BigInt(b) - BigInt(1)) > BigInt(Number.MAX_SAFE_INTEGER)) {
			throw new RangeError("Inputs would overflow number type my pal");
		}

		return Math.floor(f * (Math.pow(2, b) - 1));
	}

	// Get 2D Z-curve linearization for x and y, where b is the bit depth per dimension (currently supports up to 48 bits)
	// x and y must be positive values
	// Currently takes Number types and returns a BigInt, but we may want to convert to our own Buffer-based binary format ?????? TRUE OR NO????
	// Hack adapted to JS Buffer type: http://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN
	static _z_linearize_2d(x, y, b) {
		if (typeof x !== "number" || typeof y !== "number" || typeof b !== "number") {
			throw new TypeError("Illegal inputs bro");
		}

		if (b > 48 || b % 8 !== 0) {
			throw new RangeError("Invalid bit value dog");
		}

		const xbuf = Buffer.alloc(b / Hutil.SYS_BYTE_WIDTH);
		const ybuf = Buffer.alloc(b / Hutil.SYS_BYTE_WIDTH);
		
		xbuf.writeUIntLE(x, 0, xbuf.length);
		ybuf.writeUIntLE(y, 0, ybuf.length);
	}
}

module.exports.Hutil = Hutil;