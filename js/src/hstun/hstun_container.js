/**
 * ministun: Zero dependency STUN server for Node.js
 *
 * by Noah Levenson <noahlevenson@gmail.com>
 * 
 * mcontainer.js 
 * Useful data structures
 */

class MTypeData {
	constructor(type = null, bin = null, f = null) {
		this.type = type;
		this.bin = bin;
		this.f = f;
	}
}

module.exports.MTypeData = MTypeData;