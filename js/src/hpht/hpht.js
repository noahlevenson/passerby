const { Hutil } = require("../hutil/hutil.js");
const { Hdata } = require("../hkad/hdata.js");
const { Hpht_node } = require("./hpht_node.js");

// The Hpht class implements the PHT protocol 
// PHT keys must be BigInts in the range of BIT_DEPTH

// Currently, Hpht is essentially glue code that builds atop hkad - it's tightly coupled to the hkad implementation
// A noble goal would be to make Hpht more generalized for any underlying DHT implementation
class Hpht {
	static BIT_DEPTH = 80; // Set this to the bit depth of our input keys - currently out Hgeo linearizations are 80 bit
	static B = 4; // Max keys per leaf - what's the most optimized value for this? I think smallish B values better distribute the data in the network

	dht_node; // reference to the DHT node associated with this PHT interface
	dht_lookup; // reference to the above node's lookup function
	dht_lookup_args; // an array of args that must be passed to the above DHT lookup function to make it perform a value-based lookup
	index_attr; // Some unique string identifier for the attribute that we're indexing with this PHT interface
	
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

	// DEBUG: Print PHT stats - this walks the entire tree and prints everything we know about it
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

	// DEBUG: Get the root node, or null if we can't find it
	async _debug_get_root_node() {
		const label_hash = this._get_label_hash();
		const hdata = await this.dht_lookup.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

		if (hdata.type !== Hdata.TYPE.VAL || !(hdata.payload[0] instanceof Hpht_node)) {
			return null;
		}

		return hdata.payload[0];
	}

	// Get the hash of a PHT node label (the hash of a PHT node label is the key used to locate it in the DHT)
	// In our implementation, we concatenate the index attribute and the PHT node's binary label at hash time
	// Supplying no argument will get you the label hash of the PHT root node
	_get_label_hash(data = "") {
		if (typeof data !== "string") {
			throw new TypeError("Argument 'data' must be string");
		}

		return BigInt(`0x${Hutil._sha1(this.index_attr + data)}`);
	}

	// Init a new PHT structure - this is how you create the root node structure, and some peer in the network
	// needs to call it before any peers can start participating in the PHT associated with a given index attribute
	// It's idempotent - subsequent calls to init() will log the creation time of the existing root node
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

	// Find the PHT leaf node responsible for housing a given key - linear search edition
	// Returns null if there's no leaf node associated with that key
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

	// Find the PHT leaf node responsible for housing a given key - binary search edition
	// Returns null if there's no leaf node associated with that key
	// TODO: Currently this is much slower than linear lookup, likely because of the BigInt computations 
	// We eventually need to get this working faster and implement it as the default search, with a parallelized linear lookup as the backup
	async lookup_bin(key) {
		let p = 0;
		let r = Hpht.BIT_DEPTH - 1; // Is this off by one?
	
		while (p <= r) {
			let q = Math.floor((p + r) / 2);
			const mask = ((2n ** BigInt(Hpht.BIT_DEPTH)) - 1n) >> (BigInt(Hpht.BIT_DEPTH) - BigInt(q));
			const pq_k = key & mask;
			const label_hash = this._get_label_hash(Hutil._bigint_to_bin_str(pq_k, q));
			const hdata = await this.dht_lookup.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);
			
			if (hdata.type === Hdata.TYPE.VAL && hdata.payload[0] instanceof Hpht_node) {
				if (hdata.payload[0].is_leaf()) {
					return hdata.payload[0];
				}

				p = q + 1;
			} else {
				r = q - 1;
			}
		}

		return null;
	}

	// Insert a key, value pair into the PHT, splitting leaf nodes and extending the depth of the tree as required
	// Returns true on success, false on failure
	async insert(key, val) {
		// TODO: validation - key must be a BigInt etc.
		const leaf = await this.lookup_lin(key);

		if (leaf === null) {
			// If we can't find the leaf node for a key, our graph is likely corrupted
			// TODO: OR MAYBE IT'S A TEMPORARY RACE CONDITION? BE CAREFUL HERE...
			throw new Error("Fatal PHT graph error");
		}

		if (leaf.size() < Hpht.B) {
			leaf.put(key, val);
			const label_hash = this._get_label_hash(leaf.label);
			await this.dht_node.put.bind(this.dht_node)(label_hash, leaf);
			console.log(`[HPHT] Inserted key ${key} into PHT index ${this.index_attr}, leaf ${leaf.label} (DHT key ${label_hash})\n`);
		} else {
			// NOTE: THIS IS THE "UNLIMITED SPLIT" VERSION OF BUCKET SPLITTING - THE PAPER ALSO SPECIFIES A FASTER "STAGGERED UPDATES"
			// MODEL WHERE EACH INSERT IS LIMITED TO ONE BUCKET SPLIT, BUT WHICH COULD RESULT IN VIOLATING PHT INVARIANTS
			// DO WE WANT TO IMPLEMENT THE FASTER ONE?

			// To figure out how much deeper we need to go, we need to get the longest common prefix of all B + 1 keys
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

				// If we've reached our final depth, then the children are leaf nodes, so let's distribute the keys to them
				if (d === i) {
					pairs.forEach((pair, idx, arr) => {
						// Sort them into the new children by their ith bit? 
						// TODO: It's brittle + dumb to use the parallel bin string array
						const child_ref = key_bin_strings[idx][i] === "0" ? child0 : child1;
						child_ref.put(pair[0], pair[1]);

						console.log(`[HPHT] Redistributed key ${pair[0]} into PHT index ${this.index_attr}, leaf ${child_ref.label} (DHT key ${this._get_label_hash(child_ref.label)})\n`);
					});
				}

				// PUT the new child leaf nodes and stomp the old leaf node, which is now an interior node
				// TODO: Should we alert the caller if any of the PUTs failed? Either return false (bad pattern) or reject this whole promise (better?)
				await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child0.label), child0);
				await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child1.label), child1);
				await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(interior_node.label), interior_node);

				// if we need to iterate, old leaf must be the child node from above that has the label that is equal to
				// the longest common prefix of the keys (or just the last digit of the longest common prefix -- right?)
				old_leaf = child0.label[i - 1] === key_bin_strings[0][i - 1] ? child0 : child1;

				d += 1;
			}

			// TODO: return true, if we're using the true/false pattern for operations? or return a value if we're using the resolve/reject pattern?
		}
	}

	async delete(key) {
		// TODO: validation - key must be a BigInt etc.
		const leaf = await this.lookup_lin(key);

		if (leaf === null) {
			// Key not found
			// TODO: this should be handled using whatever global pattern we decide on for operation failures - either true/false, or reject the promise
			return false;
		}

		// OK so what are the different things that can happen here?  
		// you can remove a key from a leaf node and the leaf node has more keys in it
		// you can remove a key from a leaf node and the leaf node has 0 keys in it, but the leaf node's sibling has some keys
		// you can remove a key from a a leaf node and the leaf node has 0 keys in it and the leaf node's siblings have 0 keys - so these must be collapsed
		if (!leaf.delete(key)) {
			// The key wasn't found in the leaf node it's supposed to be found in
			// TODO: Do we want to handle this? Throw an error or return an error?
			// It could also be a temporary race condition...
		}

		if (leaf.size() > 0) {
			const label_hash = this._get_label_hash(leaf.label);
			await this.dht_node.put.bind(this.dht_node)(label_hash, leaf);
			console.log(`[HPHT] Deleted key ${key} from PHT index ${this.index_attr}, leaf ${leaf.label} (DHT key ${label_hash})\n`);
		} else {
			// Here's the case where we may have to remove some nodes
			let old_leaf = leaf;
			
			// We don't allow deletion of the depth 1 nodes -- maybe this is dumb, and we should allow deletion until only the root node remains?
			// If we decide to do that, then our init() function should only create a root node, not the depth 1 nodes
			while (old_leaf.label.length > 1) {
				const sibling_label = `${old_leaf.label.substring(0, old_leaf.label.length - 1)}${old_leaf.label[old_leaf.label.length - 1] === "0" ? "1" : "0"}`;
				const sibling_hdata = await this.dht_lookup.bind(this.dht_node)(this._get_label_hash(sibling_label), ...this.dht_lookup_args);

				if (sibling_hdata.type !== Hdata.TYPE.VAL || !(sibling_hdata.payload[0] instanceof Hpht_node)) {
					// If we can't find the leaf node for a key, our graph is likely corrupted
					// TODO: OR MAYBE IT'S A TEMPORARY RACE CONDITION? BE CAREFUL HERE...
					throw new Error("Fatal PHT graph error");
				}

				const sibling = sibling_hdata.payload[0];

				if (sibling.size() > 0) {
					// Our sibling has keys, so we can't remove the nodes at this level
					break;
				}

				// Our sibling also has 0 keys, we gotta delete this level, adjust our parent, and iterate!
				// TODO: Currently our DHT has no DELETE() operation, so we can't actually remove the PHT node from the network... but maybe we want it?
				const parent_label = old_leaf.label.substring(0, old_leaf.label.length - 1);
				const parent_hdata = await this.dht_lookup.bind(this.dht_node)(this._get_label_hash(parent_label), ...this.dht_lookup_args);

				if (parent_hdata.type !== Hdata.TYPE.VAL || !(parent_hdata.payload[0] instanceof Hpht_node)) {
					// If we can't find the leaf node for a key, our graph is likely corrupted
					// TODO: OR MAYBE IT'S A TEMPORARY RACE CONDITION? BE CAREFUL HERE...
					throw new Error("Fatal PHT graph error");
				}

				const parent = parent_hdata.payload[0];

				parent.children[0x00] = null;
				parent.children[0x01] = null;

				// THIS IS FUCKING BROKEN - DON'T FORGET TO ADJUST OUR PARENT NODE'S POINTERS
				// parent.ptr_left;
				// parent.ptr_right;

				console.log(`[HPHT] Merging leaves ${old_leaf.label} + ${sibling.label} into ${parent.label}\n`);
				await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(parent.label), parent);

				old_leaf = parent;
			}
		}
	}
}

module.exports.Hpht = Hpht;