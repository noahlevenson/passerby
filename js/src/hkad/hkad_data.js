// Class for a hoodnet data object
class Hkad_data {
	static TYPE = {
		STRING: 0,
		NODE_LIST: 1,
		PAIR: 2,
		KEY: 3,
		VAL: 4
	};

	type;
	payload;

	constructor({type = null, payload = null} = {}) {
		if (type === null || !Array.isArray(payload) || payload.length < 1) {
			throw new Error("Bro you messed up params")
		}

		this.type = type;
		this.payload = payload;
	}
}

module.exports.Hkad_data = Hkad_data;