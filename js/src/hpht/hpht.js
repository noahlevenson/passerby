const { Hutil } = require("../hutil/hutil.js");
const { Hdata } = require("../hkad/hdata.js");
const { Hpht_node } = require("./hpht_node.js");

// The Hpht class implements the PHT protocol 
// PHT keys must be BigInts in the range of BIT_DEPTH

// Currently, Hpht is essentially glue code that builds atop hkad - it's tightly coupled to the hkad implementation
// A noble goal would be to make Hpht more generalized for any underlying DHT implementation
class Hpht {
	static BIT_DEPTH = 80; // What's the bit depth of our input keys? Currently out Hgeo linearizations are 80 bit
	static B = 4; // Max keys per leaf - what's the most optimized value for this? I think smallish B values better distribute the data in the network

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

	// Print PHT stats for debugging
	// This can be much simpler, I'm sure of it
	async _debug_print_stats() {
		async function _walk(pht_node, nodes = 0, keys = 0, leaves = 0) {
			if (pht_node.children[0x00] !== null && pht_node.children[0x01] !== null) {
				const hdata0 = await this.dht_lookup.bind(this.dht_node)(this._get_label_hash(pht_node.children[0x00]), ...this.dht_lookup_args);
				const hdata1 = await this.dht_lookup.bind(this.dht_node)(this._get_label_hash(pht_node.children[0x01]), ...this.dht_lookup_args);
				const child0 = hdata0.payload[0];
				const child1 = hdata1.payload[0];
				({nodes, keys, leaves} = await _walk.bind(this)(child0, nodes, keys, leaves));
				({nodes, keys, leaves} = await _walk.bind(this)(child1, nodes, keys, leaves));
			}

			console.log(`[HPHT] ${this.index_attr}${pht_node.label} ${pht_node.is_leaf() ? "<- LEAF, " + pht_node.size() + " KEYS" : ""}`);

			keys += pht_node.size();
			nodes += 1;

			if (pht_node.is_leaf()) {
				leaves += 1;
			}

			return {nodes: nodes, keys: keys, leaves: leaves};
		}

		const root_node = await this._debug_get_root_node();

		if (root_node === null) {
			console.log(`[HPHT] Stats error: no root node found!`);
			return null;
		}

		console.log(`\n[HPHT] DEBUG - PHT STRUCTURE (INVERTED):`);
		const res = await _walk.bind(this)(root_node);
		console.log(`[HPHT] TOTAL STATS - nodes: ${res.nodes}, leaves: ${res.leaves}, keys: ${res.keys}\n`);	
	}

	async _debug_get_root_node() {
		const label_hash = this._get_label_hash();
		const hdata = await this.dht_lookup.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

		if (hdata.type !== Hdata.TYPE.VAL || !(hdata.payload[0] instanceof Hpht_node)) {
			return null;
		}

		return hdata.payload[0];
	}

	// Data as a string
	// Passing no argument gets the label hash for the root node
	_get_label_hash(data = "") {
		if (typeof data !== "string") {
			throw new TypeError("Argument 'data' must be string");
		}

		return BigInt(`0x${Hutil._sha1(this.index_attr + data)}`);
	}

	async init() {
		// TODO: use proper logging functions
		console.log(`[HPHT] Looking up root node for index attr ${this.index_attr}...`);

		// TODO: Use binary search version
		const label_hash = this._get_label_hash();
		const hdata = await this.dht_lookup.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

		if (hdata.type === Hdata.TYPE.VAL && hdata.payload[0] instanceof Hpht_node) {
			console.log(`[HPHT] Root node found! Created ${hdata.payload[0].created}`);
		} else {
			console.log(`[HPHT] No root node found! Creating new root structure for index attr ${this.index_attr}...`);

			// TODO: All the BigInt(0) and BigInt(1) is confusing

			const root = new Hpht_node({label: ""});
			root.children[0x00] = Hutil._bigint_to_bin_str(BigInt(0), 1);
			root.children[0x01] = Hutil._bigint_to_bin_str(BigInt(1), 1);

			const l0_label = Hutil._bigint_to_bin_str(BigInt(0), 1);
			const l0 = new Hpht_node({label: l0_label});
			
			const l1_label = Hutil._bigint_to_bin_str(BigInt(1), 1);
			const l1 = new Hpht_node({label: l1_label});
			
			l0.ptr_right = l1_label;
			l1.ptr_left = l0_label;

			await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(l0_label), l0); // TODO: Await successful result or stop on failure
			await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(l1_label), l1); // TODO: Await successful result or stop on failure
			await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(), root); // TODO: Await successful result or stop on failure
		}
	}

	async lookup_lin(key) {
		// TODO: validation
		if (typeof key !== "bigint") {
			throw new TypeError("Argument 'key' must be BigInt");
		}

		let mask = 0x01n;

		for (let i = 0; i < Hpht.BIT_DEPTH; i += 1) {
			const pi_k = key & mask;
			const label_hash = this._get_label_hash(Hutil._bigint_to_bin_str(pi_k, i));

			const hdata = await this.dht_lookup.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

			if (hdata.type === Hdata.TYPE.VAL) {
				const pht_node = hdata.payload[0];

				if (pht_node instanceof Hpht_node && pht_node.is_leaf()) {
					return pht_node;
				}
			}

			mask |= (0x01n << BigInt(i));
		}

		return null;
	}	

	// TODO: implement me
	lookup_bin(key) {

	}

	async insert(key, val) {
		// TODO: validation - key must be a BigInt etc.
		const leaf = await this.lookup_lin(key);

		if (leaf === null) {
			// TODO: Either this PHT never got intialized with an index attr or this is a fatal error - the graph is broken
			throw new Error("Fatal error: PHT graph error");
		}

		if (leaf.size() < Hpht.B) {
			leaf.put(key, val);
			const label_hash = this._get_label_hash(leaf.label);
			await this.dht_node.put.bind(this.dht_node)(label_hash, leaf);
			console.log(`[HPHT] Inserted key ${key} into PHT index ${this.index_attr}, leaf ${leaf.label} (DHT key ${label_hash})\n`)
		} else {
			// Split case
			// TODO: this is the staggered version where only one split is allowed per insertion
			// it reduces costs in the worst case, but it can violate the PHT invariants (leafs can store more than B keys)
			// Do we want to implement the more correct version that can cause cascaded splits?
			const child0 = new Hpht_node({label: `${leaf.label}0`});
			const child1 = new Hpht_node({label: `${leaf.label}1`});

			console.log(`[HPHT] Splitting leaf ${leaf.label} into ${child0.label} + ${child1.label}\n`)

			child0.ptr_left = leaf.ptr_left;
			child0.ptr_right = child1.label;
			child1.ptr_left = child0.label;
			child1.ptr_right = leaf.ptr_right;

			const old_leaf = new Hpht_node({label: leaf.label});
			old_leaf.children[0x00] = child0.label;
			old_leaf.children[0x01] = child1.label;

			await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child0.label), child0);
			await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child1.label), child1);
			await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(old_leaf.label), old_leaf);

			const pairs = leaf.get_all_pairs();

			pairs.forEach(async (pair) => {
				await this.insert(BigInt(`0x${pair[0]}`), pair[1]);
			});

			await this.insert(key, val);
		}
	}
}

module.exports.Hpht = Hpht;