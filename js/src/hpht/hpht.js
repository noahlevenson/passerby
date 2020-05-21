const { Hutil } = require("../hutil/hutil.js");
const { Hkad_data } = require("../hkad/hkad_data.js");
const { Hpht_node } = require("./hpht_node.js");
const { Hbigint } = require("../htypes/hbigint/hbigint_node.js");

// The Hpht class implements the PHT protocol 
// PHT keys must be BigInts in the range of BIT_DEPTH

// Currently, Hpht is essentially glue code that builds atop hkad - it's tightly coupled to the hkad implementation
// A noble goal would be to make Hpht more generalized for any underlying DHT implementation
class Hpht {
	static BIT_DEPTH = 80; // Set this to the bit depth of our input keys - currently out Hgeo linearizations are 80 bit
	static B = 4; // Max keys per leaf - what's the most optimized value for this? I think smallish B values better distribute the data in the network

	dht_node; // reference to the DHT node associated with this PHT interface
	dht_lookup_func; // reference to the above node's lookup function
	dht_lookup_args; // an array of args that must be passed to the above DHT lookup function to make it perform a value-based lookup
	index_attr; // Some unique string identifier for the attribute that we're indexing with this PHT interface
	
	constructor({index_attr = null, dht_node = null, dht_lookup_func = null, dht_lookup_args = []} = {}) {
		// TODO: validation
		if (typeof index_attr !== "string") {
			throw new TypeError("Argument index_attr must be a string");
		} 

		if (typeof dht_lookup_func !== "function") {
			throw new TypeError("Argument dht_lookup must be a function");
		}

		if (!Array.isArray(dht_lookup_args)) {
			throw new TypeError("Argument dht_lookup_args must be an Array");
		}
		
		this.dht_node = dht_node;
		this.dht_lookup_func = dht_lookup_func;
		this.dht_lookup_args = dht_lookup_args;
		this.index_attr = index_attr
	}

	// DEBUG: Print PHT stats - this walks the entire tree and prints everything we know about it
	async _debug_print_stats() {
		async function _walk(pht_node, nodes = 0, keys = 0, leaves = 0) {
			if (!pht_node.is_leaf()) {
				const child0 = await this._dht_lookup(pht_node.children[0x00]);
				const child1 = await this._dht_lookup(pht_node.children[0x01]);

				if (child0 === null || child1 === null) {
					throw new Error("Fatal PHT graph error");
				}

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
		return await this._dht_lookup();
	}

	// Get a PHT node from the DHT -- returns the node if found, null if not
	// This is where we rehydrate PHT nodes -- is this the most logical place for that?
	async _dht_lookup(label = "") {
		if (label === null) {
			return null;
		}

		const label_hash = this._get_label_hash(label);
		const res = await this.dht_lookup_func.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

		// This assumes that dht lookups always return an Hkad_data type, which I *think* is true
		const data = new Hkad_data(res);

		if (data.get_type() !== Hkad_data.TYPE.VAL || !Hpht_node.valid_magic(data.get_payload()[0])) {
			return null;
		}

		return new Hpht_node(data.get_payload()[0]);
	}

	// Get the hash of a PHT node label (the hash of a PHT node label is the key used to locate it in the DHT)
	// In our implementation, we concatenate the index attribute and the PHT node's binary label at hash time
	// Supplying no argument will get you the label hash of the PHT root node
	_get_label_hash(data = "") {
		if (typeof data !== "string") {
			throw new TypeError("Argument 'data' must be string");
		}

		return new Hbigint(Hutil._sha1(this.index_attr + data));
	}

	// Init a new PHT structure - this is how you create the root node structure, and some peer in the network
	// needs to call it before any peers can start participating in the PHT associated with a given index attribute
	// It's idempotent - subsequent calls to init() will log the creation time of the existing root node
	async init() {
		console.log(`[HPHT] Looking up root node for index attr ${this.index_attr}...`);
		const data = await this._dht_lookup();

		if (data !== null) {
			console.log(`[HPHT] Root node found! Created ${data.created}`);
			return;
		}

		console.log(`[HPHT] No root node found! Creating new root structure for index attr ${this.index_attr}...`);
		const root = new Hpht_node({label: ""});
		const child0 = new Hpht_node({label: (new Hbigint(0)).to_bin_str(1)});
		const child1 = new Hpht_node({label: (new Hbigint(1)).to_bin_str(1)});

		child0.set_ptrs({left: null, right: child1.get_label()});
		child1.set_ptrs({left: child0.get_label(), right: null});
		
		root.children[0x00] = child0.get_label();
		root.children[0x01] = child1.get_label();

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
		if (!(key instanceof Hbigint)) {
			throw new TypeError("Argument 'key' must be Hbigint");
		}

		let mask = new Hbigint(0x01);

		for (let i = 0; i < Hpht.BIT_DEPTH; i += 1) {
			const pi_k = key.and(mask);
			const pht_node = await this._dht_lookup(pi_k.to_bin_str(i));

			if (pht_node !== null && pht_node.is_leaf()) {
				return pht_node;
			}

			mask = mask.or((new Hbigint(0x01)).shift_left(new Hbigint(i)));
		}

		return null;
	}	

	// Find the PHT leaf node responsible for housing a given key - binary search edition
	// Returns null if there's no leaf node associated with that key
	// TODO: Currently this is much slower than linear lookup, likely because of the BigInt computations 
	// We eventually need to get this working faster and implement it as the default search, with a parallelized linear lookup as the backup
	// TODO: This also needs to be refactored to use the _dht_lookup() helper function 
	async lookup_bin(key) {
		let p = 0;
		let r = Hpht.BIT_DEPTH - 1; // Is this off by one?
	
		while (p <= r) {
			let q = Math.floor((p + r) / 2);
			//const mask = ((2n ** BigInt(Hpht.BIT_DEPTH)) - 1n) >> (BigInt(Hpht.BIT_DEPTH) - BigInt(q));   <--- old line right here, just in case your tests fail
		
			const mask = ((new Hbigint(2)).pow(new Hbigint(Hpht.BIT_DEPTH))).sub(new Hbigint(1)).shift_right(new Hbigint(Hpht.BIT_DEPTH) - new Hbigint(q));			
			const pq_k = key.and(mask);
			const label_hash = this._get_label_hash(pq_k.to_bin_str(q));
			const hdata = await this.dht_lookup_func.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);
			
			if (hdata.type === Hkad_data.TYPE.VAL && Hpht_node.valid_magic(hdata.payload[0])) {
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
			console.log(`[HPHT] Inserted key ${key.toString()} into PHT index ${this.index_attr}, leaf ${leaf.label} (DHT key ${label_hash})\n`);
		} else {
			// NOTE: THIS IS THE "UNLIMITED SPLIT" VERSION OF BUCKET SPLITTING - THE PAPER ALSO SPECIFIES A FASTER "STAGGERED UPDATES"
			// MODEL WHERE EACH INSERT IS LIMITED TO ONE BUCKET SPLIT, BUT WHICH COULD RESULT IN VIOLATING PHT INVARIANTS
			// DO WE WANT TO IMPLEMENT THE FASTER ONE?

			// To figure out how much deeper we need to go, we need to get the longest common prefix of all B + 1 keys
			// Get an array of all B + 1 (key, val) pairs with all keys as BigInts
			const pairs = leaf.get_all_pairs();

			pairs.forEach((pair, i, arr) => {
				arr[i] = [new Hbigint(pair[0]), pair[1]];
			});
			
			pairs.push([key, val]);

			// Get an array of the binary strings for each (key, val) pair
			const key_bin_strings = [];

			pairs.forEach((pair) => {
				key_bin_strings.push(pair[0].to_bin_str(Hpht.BIT_DEPTH));
			});

			// Since we used _bigint_to_bin_str to make our bin strings the same length, we don't have to get too fancy here
			// TODO: This is a crappy linear search solution - there's a better way using binary search
			// TODO: There's now an Hutil function that returns LCP -- we should be using that dummy
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

			// This is <= instead of < because: i have 5 keys, their longest common prefix length is i, which means we need to redistribute them at level d + i
			// e.g. -- i'm at level 2, and my 5 keys have a lcp length of 2 -- so we do one iteration to create the child nodes, that iteration is the last iteratioon (d === i)
			// so we distribute the keys into those nodes, make them leaves, and stop iterating
			while (d <= i) {
				child0 = new Hpht_node({label: `${old_leaf.label}0`});
				child1 = new Hpht_node({label: `${old_leaf.label}1`});

				console.log(`[HPHT] Splitting leaf ${old_leaf.label} into ${child0.label} + ${child1.label}\n`)

				child0.set_ptrs({left: old_leaf.ptr_left(), right: child1.get_label()});
				child1.set_ptrs({left: child0.get_label(), right: old_leaf.ptr_right()});

				const interior_node = new Hpht_node({label: old_leaf.label});
				interior_node.children[0x00] = child0.label;
				interior_node.children[0x01] = child1.label;

				// If we've reached our final depth, then the children are leaf nodes, so let's distribute the keys to them
				// When you see this pattern, shouldn't this be a recursive algorithm where we handle the base case (d === i) instead of an iterative one?
				if (d === i) {
					pairs.forEach((pair, idx, arr) => {
						// Sort them into the new children by their ith bit? 
						// TODO: It's brittle + dumb to use the parallel bin string array
						const child_ref = key_bin_strings[idx][i] === "0" ? child0 : child1;
						child_ref.put(pair[0], pair[1]);

						console.log(`[HPHT] Redistributed key ${pair[0].toString()} into PHT index ${this.index_attr}, leaf ${child_ref.label} (DHT key ${this._get_label_hash(child_ref.label)})\n`);
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

		if (!leaf.delete(key)) {
			// The key wasn't found in the leaf node it's supposed to be found in
			// TODO: Do we want to handle this? Throw an error or return an error?
			// It could also be a temporary race condition...
			// At best, there's no reason to PUT this node back to the PHT, since we didn't actually modify its state...
			return;
		}

		const sibling_node = await this._dht_lookup(leaf.get_sibling_label());

		if (sibling_node === null) {
			throw new Error("Fatal PHT graph error");
		}

		if (leaf.size() + sibling_node.size() > Hpht.B) {
			// Simple case: leaf + its sibling node contains more than B keys, so the invariant is maintained
			console.log(`[HPHT] Deleted key ${key.toString()} from PHT index ${this.index_attr}, leaf ${leaf.get_label()} (DHT key ${this._get_label_hash(leaf.get_label())})\n`);
		} else {
			// Hard case: leaf + its sibling nodes contain <= B keys, so we can do a merge 
			const pairs = leaf.get_all_pairs().concat(sibling_node.get_all_pairs());

			pairs.forEach((pair, i, arr) => {
				arr[i] = [new Hbigint(pair[0]), pair[1]];
			});
			
			// Get an array of the binary strings for each (key, val) pair
			const key_bin_strings = [];

			pairs.forEach((pair) => {
				key_bin_strings.push(pair[0].to_bin_str(Hpht.BIT_DEPTH));
			});

			// Our current depth = the length of our label
			let d = leaf.get_label().length;

			// Length of the longest common prefix of all keys between leaf and its sibling
			const i = Hutil._get_lcp(key_bin_strings, true);

			let old_leaf = leaf;

			// d > 1 ensures that we don't delete our level one nodes, since our basic structure consists of root + two children
			while (d > 1 && d > i) {
				const parent_node = await this._dht_lookup(old_leaf.get_parent_label());

				if (parent_node === null) {
					throw new Error("Fatal PHT graph error");
				}

				parent_node.children[0x00] = null;
				parent_node.children[0x01] = null;

				// Fixing up our parent node's pointers
				// We need to know if our leaf is a 0 or a 1 node (0 node is "left", 1 node is "right")
				let child0, child1;

				if (old_leaf.get_label()[old_leaf.get_label().length - 1] === "0") {
					child0 = old_leaf;
					child1 = sibling_node;
				} else {
					child0 = sibling_node;
					child1 = old_leaf;
				}

				// (get the childrens parent, get the left child's left neighbor, get the right child's right neighbor, set the 
				// left neighbor's right neighbor to parent, set the right neighbor's left neighbor to parent)

				const left_neighbor = await this._dht_lookup(child0.ptr_left());
				const right_neighbor = await this._dht_lookup(child1.ptr_right());

				// Neighbors can be null here -- that just means we reached the left or right end of the tree

				if (left_neighbor !== null) {
					left_neighbor.set_ptrs({left: left_neighbor.ptr_left(), right: parent_node.get_label()});
				}

				if (right_neighbor !== null) {
					right_neighbor.set_ptrs({left: parent_node.get_label(), right: right_neighbor.ptr_right()});
				}

				parent_node.set_ptrs({
					left: left_neighbor !== null ? left_neighbor.get_label() : null, 
					right: right_neighbor !== null ? right_neighbor.get_label() : null
				});

				// We've reached our final depth, so redistribute keys to the parent node
				if (d - i === 1) {
					pairs.forEach((pair, idx, arr) => {
						parent_node.put(pair[0], pair[1]);
						console.log(`[HPHT] Redistributed key ${pair[0].toString()} into PHT index ${this.index_attr}, leaf ${parent_node.get_label()} (DHT key ${this._get_label_hash(parent_node.get_label())})\n`);
					});
				}

				// PUT the new leaf node (the parent node) and its non-null right and left neighbors 
				// TODO: Should we alert the caller if any of the PUTs failed? Either return false (bad pattern) or reject this whole promise (better?)
				await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(parent_node.get_label()), parent_node);

				if (left_neighbor !== null) {
					await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(left_neighbor.get_label()), left_neighbor);
				}

				if (right_neighbor !== null) {
					await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(right_neighbor.get_label()), right_neighbor);
				}

				// If we need to iterate, old_leaf must be the parent
				old_leaf = parent_node;

				d -= 1;
			}
		}

		// TODO: return true, if we're using the true/false pattern for operations? or return a value if we're using the resolve/reject pattern?
	}

	// TODO: implement me
	// 1D range query assumes the keys are just keys (as opposed to linearizations of some multidimensional data)
	// We don't use 1D range query to query geohash index attributes, which are linearizations of 2D data, but
	// maybe in the future we may want to use a PHT interface to index some 1-dimensional attribute
	async range_query_1d(minkey, maxkey) {

	}

	// 2D range query assumes that each key is a linearizations of some 2D data, and currently it makes
	// the gross assumption that we've used our Hutil._z_linearize_2d() function to produce the linearization
	// TODO: How should this work, how do we keep it generalized and loosely coupled?
	async range_query_2d(minkey, maxkey) {
		async function _do_range_query_2d(pht_node, prefix, data = []) {
			// Bro this shit is horrible - we should catch the base case first -- this is structured insanely 
			if (pht_node.is_leaf()) {
				// "apply the range query to all items within this node and report the result"
				// i think that just means the items in this node represent the entirety of what must be returned by the range query
				return pht_node.get_all_pairs().filter((pair) => {
					const key = new Hbigint(pair[0]);
					return key.greater_equal(minkey) && key.less_equal(maxkey);
				});
			} 

			// is there any overlap between the rectangular region defined by the subtree's prefix and the range of the original query?
			// TODO: is this an insane way to do this?  Can't we just learn this by comparing the 0's and 1's???
			const min_region = Hbigint.from_base2_str(key_strings[0].substring(0, prefix.length + 1));
			const max_region = Hbigint.from_base2_str(key_strings[1].substring(0, prefix.length + 1));

			const child0_label = `${prefix}0`;
			const child1_label = `${prefix}1`;

			const child0_rect = Hbigint.from_base2_str(child0_label);  
			const child1_rect = Hbigint.from_base2_str(child1_label);

			// TODO: This needs to actually be parallelized for speed
			if (child0_rect.greater_equal(min_region) && child0_rect.less_equal(max_region)) {
				// Recurse 
				const child_node = await this._dht_lookup(child0_label);

				if (child_node === null) {
					throw new Error("Fatal PHT graph error");
				}

				data = data.concat(await _do_range_query_2d.bind(this)(child_node, child0_label, data));
			}

			if (child1_rect.greater_equal(min_region) && child1_rect.less_equal(max_region)) {
				// Recurse
				const child_node = await this._dht_lookup(child1_label);

				if (child_node === null) {
					throw new Error("Fatal PHT graph error");
				}

				data = data.concat(await _do_range_query_2d.bind(this)(child_node, child1_label, data));
			}
			
			return data;
		}

		if (!(minkey instanceof Hbigint) || !(maxkey instanceof Hbigint)) {
			throw new TypeError("Arguments 'minkey' and 'maxkey' must be Hbigint");
		}

		if (minkey.greater_equal(maxkey)) {
			throw new RangeError("'minkey' must be less than 'maxkey'");
		}

		// First, get the longest common binary prefix of these keys
		const key_strings = [];
		key_strings.push(minkey.to_bin_str(Hpht.BIT_DEPTH));
		key_strings.push(maxkey.to_bin_str(Hpht.BIT_DEPTH));
		let lcp = Hutil._get_lcp(key_strings);

		// Now get the PHT node labeled with that prefix
		const pht_node = await this._dht_lookup(lcp);

		if (pht_node === null) {
			throw new Error("Fatal PHT graph error");
		}

		// Perform recursive parallel traversal of this PHT node
		return await _do_range_query_2d.bind(this)(pht_node, lcp);
	}
}

module.exports.Hpht = Hpht;