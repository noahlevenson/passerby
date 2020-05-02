const crypto = require("crypto");

// Utility functions
class Hutil {
	static SYS_BYTE_WIDTH = 8;
	static HEX_STR_PREFIX = "0x";

	// JSON serializer for BigInt type - this is set on the BigInt prototype at the HAPP layer
	static _bigint_to_json() {
		return `${Hutil.HEX_STR_PREFIX}${this.toString(16)}`;
	}

	// BigInt reviver function - this is applied at the individual application NET layer to revive long hex values
	// In a world where we have other implementations written in other languages, long hex values actually remain portable
	// we'd just need to chop off the HEX_STR_PREFIX and then revive them as whatever format works -- likely just a buffer of bytes
	static _bigint_revive(key, val) {
		if (typeof val === "string" && val.substring(0, 2) === Hutil.HEX_STR_PREFIX) {
			return BigInt(val);
		}

		return val;
	}

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

	// Return the longest common prefix of an array of strings
	// If len is true, function returns the LENGTH of the lcp instead of the lcp itself
	// TODO: this is a slow linear search solution, there's a better way with binary search
	static _get_lcp(strings = [], len = false) {
		if (!Array.isArray(strings)) {
			throw new TypeError("Argument 'strings' must be array");
		}

		const all_strings = strings.every((str) => {
			return typeof str == "string";
		});

		if (!all_strings) {
			throw new TypeError("All elements of argument 'strings' must be strings");
		}

		const lengths = strings.map((str) => {
			return str.length;
		});

		const shortest = Math.min(...lengths);
		let i = 0;
		
			while (i < shortest) {
				const match = strings.every((str) => {
					return str[i] === strings[0][i];
				});

				if (!match) {
					break;
				}

				i += 1;
			}

		if (len) {
			return i;
		}

		return strings[0].substring(0, i);
	}
}

module.exports.Hutil = Hutil;