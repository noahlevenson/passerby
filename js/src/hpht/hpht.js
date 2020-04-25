const { Hutil } = require("../hutil/hutil.js");
const { Hdata } = require("../hkad/hdata.js");
const { Hpht_node } = require("./hpht_node.js");

// The Hpht class implements the PHT protocol 
// PHT keys must be BigInts in the range of BIT_DEPTH

// Currently, Hpht is essentially glue code that builds atop hkad - it's tightly coupled to the hkad implementation
// A noble goal would be to make Hpht more generalized for any underlying DHT implementation
class Hpht {
	static BIT_DEPTH = 80; // This corresponds to the depth of the trie
	static B = 4; // Max keys per leaf - what's the most optimized value for this?

	dht_node;
	dht_lookup; // We assume that the dht_lookup function returns a promise
	dht_lookup_args; // Any args that must be passed to the DHT lookup function to make it perform a value lookup
	index_attr;
	
	constructor({index_attr = null, dht_node = null, dht_lookup = null, dht_lookup_args = []} = {}) {
		// TODO: validation
		if (typeof index_attr !== "string") {
			throw new TypeError("Argument index_attr must be a string");
		} 

		if (typeof dht_lookup !== "function") {
			throw new TypeError("Argument dht_lookup must be a function");
		}

		if (!Array.isArray(dht_lookup_args)) {
			throw new TypeError("Argument dht_lookup_args must be an Array");
		}
		
		this.dht_node = dht_node;
		this.dht_lookup = dht_lookup;
		this.dht_lookup_args = dht_lookup_args;
		this.index_attr = index_attr
	}

	// Data as a string
	_get_label_hash(data = "") {
		return BigInt(`0x${Hutil._sha1(this.index_attr + data)}`);
	}


	init() {
		return new Promise(async (resolve, reject) => {
			// TODO: use proper logging functions
			console.log(`[HPHT] Looking up root node for index attr ${this.index_attr}...`);

			// TODO: Use binary search version
			const label_hash = this._get_label_hash();
			const hdata = await this.dht_lookup.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

			if (hdata.type === Hdata.TYPE.VAL && hdata.payload[0] instanceof Hpht_node) {
				console.log(`[HPHT] Root node found! Created ${hdata.payload[0].created}`);
			} else {
				console.log(`[HPHT] No root node found! Creating new root structure for index attr ${this.index_attr}...`);

				const root = new Hpht_node();
				root.children[0x00] = BigInt(0);
				root.children[0x01] = BigInt(1);

				const l0 = new Hpht_node();
				l0.ptr_right = BigInt(1);

				const l1 = new Hpht_node();
				l1.ptr_left = BigInt(0);

				const root_label_hash = this._get_label_hash();
				const l0_label_hash = this._get_label_hash(BigInt(0).toString());
				const l1_label_hash = this._get_label_hash(BigInt(1).toString());

				this.dht_node.put.bind(this.dht_node)(l0_label_hash, l0); // TODO: Confirm successful result or stop on failure
				this.dht_node.put.bind(this.dht_node)(l1_label_hash, l1); // TODO: Confirm successful result or stop on failure
				this.dht_node.put.bind(this.dht_node)(root_label_hash, root); // TODO: Confirm successful result or stop on failure
			}

			resolve();
		});
	}

	lookup_lin(key) {
		return new Promise(async (resolve, reject) => {
			// TODO: validation
			let mask = 0x01n;

			for (let i = 0; i < Hpht.BIT_DEPTH; i += 1) {
				const pi_k = key & mask;
				const label_hash = this._get_label_hash(pi_k.toString());
				const hdata = await this.dht_lookup.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

				if (hdata.type === Hdata.TYPE.VAL) {
					const pht_node = hdata.payload[0];

					if (pht_node instanceof Hpht_node && pht_node.is_leaf()) {
						resolve(pht_node);
						return;
					}
				}

				mask |= (0x01n << BigInt(i));
			}

			resolve(null);  // TODO: Is it nicer if the failure case causes a reject()?
		});
	}	

	// TODO: implement me
	lookup_bin(key) {

	}
}

module.exports.Hpht = Hpht;