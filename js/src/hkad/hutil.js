// Utility functions
class Hutil {
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

	static _sort_by_distance_from(arr, n) {
		return arr.sort((a, b) => {
			return Math.abs(a - n) - Math.abs(b - n);
		});
	}

	// TODO: This is just here as part of our NON CRYPTOGRAPHICALLY SECURE random key generator
	// remove this crap and make a secure system
	// Little endian addressing
	static _set_bit(buffer, idx, off) {
		let mask = Buffer.alloc(1);

		mask[0] = 0x01;
		mask[0] <<= off;

		buffer[idx] |= mask[0];
	}
}

module.exports.Hutil = Hutil;