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
				
				if (hdata0.type !== Hdata.TYPE.VAL || !(hdata0.payload[0] instanceof Hpht_node)) {
					throw new Error("Fatal PHT graph error");
				}

				const hdata1 = await this.dht_lookup.bind(this.dht_node)(this._get_label_hash(pht_node.children[0x01]), ...this.dht_lookup_args);

				if (hdata1.type !== Hdata.TYPE.VAL || !(hdata1.payload[0] instanceof Hpht_node)) {
					throw new Error("Fatal PHT graph error");
				}

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
		console.log(`[HPHT] Looking up root node for index attr ${this.index_attr}...`);

		const label_hash = this._get_label_hash();
		const hdata = await this.dht_lookup.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

		if (hdata.type === Hdata.TYPE.VAL && hdata.payload[0] instanceof Hpht_node) {
			console.log(`[HPHT] Root node found! Created ${hdata.payload[0].created}`);
			return;
		}

		console.log(`[HPHT] No root node found! Creating new root structure for index attr ${this.index_attr}...`);
		const root = new Hpht_node({label: ""});

		const child0 = new Hpht_node({label: Hutil._bigint_to_bin_str(BigInt(0), 1)});
		const child1 = new Hpht_node({label: Hutil._bigint_to_bin_str(BigInt(1), 1)});

		child0.ptr_right = child1.label;
		child1.ptr_left = child0.label;
		
		root.children[0x00] = child0.label;
		root.children[0x01] = child1.label;

		const results = [];
		results.push(await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child0.label), child0));
		results.push(await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child1.label), child1));
		results.push(await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(), root));

		if (results.some((result) => { return !result })) {
			console.log(`[HPHT] WARNING! COULD NOT CREATE NEW ROOT STRUCTURE FOR INDEX ATTR ${this.index_attr}!`);
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

	async insert_old(key, val) {
		// TODO: validation - key must be a BigInt etc.
		const leaf = await this.lookup_lin(key);

		if (leaf === null) {
			// If we can't find the leaf node for a key, our graph is likely corrupted
			throw new Error("Fatal PHT graph error");
		}

		if (leaf.size() < Hpht.B) {
			leaf.put(key, val);
			const label_hash = this._get_label_hash(leaf.label);
			await this.dht_node.put.bind(this.dht_node)(label_hash, leaf);
			console.log(`[HPHT] Inserted key ${key} into PHT index ${this.index_attr}, leaf ${leaf.label} (DHT key ${label_hash})\n`);
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

	async insert(key, val) {
		// TODO: validation - key must be a BigInt etc.
		const leaf = await this.lookup_lin(key);

		if (leaf === null) {
			// If we can't find the leaf node for a key, our graph is likely corrupted
			throw new Error("Fatal PHT graph error");
		}

		if (leaf.size() < Hpht.B) {
			leaf.put(key, val);
			const label_hash = this._get_label_hash(leaf.label);
			await this.dht_node.put.bind(this.dht_node)(label_hash, leaf);
			console.log(`[HPHT] Inserted key ${key} into PHT index ${this.index_attr}, leaf ${leaf.label} (DHT key ${label_hash})\n`);
		} else {
			// First, get the longest common prefix of all B + 1 keys
			// Get an array of all B + 1 (key, val) pairs with all keys as BigInts
			const pairs = leaf.get_all_pairs();

			pairs.forEach((pair, i, arr) => {
				arr[i] = [BigInt(`0x${pair[0]}`), pair[1]];
			});
			
			pairs.push([key, val]);

			// Get an array of the binary strings for each (key, val) pair
			const key_bin_strings = [];

			pairs.forEach((pair) => {
				key_bin_strings.push(Hutil._bigint_to_bin_str(pair[0], Hpht.BIT_DEPTH));
			});

			// console.log(key_bin_strings);

			// Since we used _bigint_to_bin_str to make our bin strings the same length, we don't have to get too fancy here
			// TODO: This is a crappy linear search solution - there's a better way using binary search
			// Let's pull this out and put it in Hutil
			let i = 0;

			while (i < Hpht.BIT_DEPTH) {
				let match = key_bin_strings.every((str) => {
					return str[i] === key_bin_strings[0][i];
				});

				if (!match) {
					break;
				}

				i += 1;
			}

			// console.log(`LCS: ${i}`)

			// console.log(i);
			// console.log(`Depth of current leaf node: ${leaf.label.length}`)

			// i is the length of the longest common prefix - we need our new child nodes to be one level deeper than that
			// remember, the depth of a given node is equal to the length of its label (not including the index attr)
			let child0, child1;
			let old_leaf = leaf;
			let d = leaf.label.length; 

			while (d <= i) {
				child0 = new Hpht_node({label: `${old_leaf.label}0`});
				child1 = new Hpht_node({label: `${old_leaf.label}1`});

				console.log(`[HPHT] Splitting leaf ${old_leaf.label} into ${child0.label} + ${child1.label}\n`)

				// THIS IS FUCKING BROKEN
				// child0.ptr_left = leaf.ptr_left;
				// child0.ptr_right = child1.label;
				// child1.ptr_left = child0.label;
				// child1.ptr_right = leaf.ptr_right;

				const interior_node = new Hpht_node({label: old_leaf.label});
				interior_node.children[0x00] = child0.label;
				interior_node.children[0x01] = child1.label;

				// if we need to iterate, old leaf must be the child node from above that has the label that is equal to
				// the longest common prefix of the keys (or just the last digit of the longest common prefix -- right?)
				old_leaf = child0.label[i - 1] === key_bin_strings[0][i - 1] ? child0 : child1;

				// PUT the new child leaf nodes and stomp the old leaf node, which is now an interior node
				await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child0.label), child0);
				await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child1.label), child1);
				await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(interior_node.label), interior_node);

				d += 1;
			}

			// Now you're ready to distribute keys into the new children
			// TODO: This is really begging for concurrency problems - since we PUT all nodes in the loop above,
			// we always have to PUT the final leaf nodes twice - once without keys and once with the keys inserted
			pairs.forEach((pair, idx, arr) => {
				// Sort them into the new children by their ith bit? 
				// TODO: It's brittle + dumb to use the parallel bin string array
				const child_ref = key_bin_strings[idx][i] === "0" ? child0 : child1;
				child_ref.put(pair[0], pair[1]);

				console.log(`[HPHT] Redistributed key ${pair[0]} into PHT index ${this.index_attr}, leaf ${child_ref.label} (DHT key ${this._get_label_hash(child_ref.label)})\n`);
			});

			await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child0.label), child0);
			await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child1.label), child1);
		}
	}
}

module.exports.Hpht = Hpht;