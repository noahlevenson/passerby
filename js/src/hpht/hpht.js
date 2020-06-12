/** 
* HPHT
* PHT interface
* HPHT builds atop HKAD to provide PHT functionality
* for semantic range queries
*
*
*/ 

"use strict";

const { Hutil } = require("../hutil/hutil.js");
const { Hkad_data } = require("../hkad/hkad_data.js");
const { Hpht_node } = require("./hpht_node.js");
const { Hbigint } = require("../htypes/hbigint/hbigint_node.js");

class Hpht {
	static BIT_DEPTH = 80; // Bit depth of our input keys (our Hgeo linearizations are 80 bits)
	static B = 4; // Block size, or max keys per leaf

	dht_node; // reference to the DHT node associated with this PHT interface
	dht_lookup_func; // reference to the above node's lookup function
	dht_lookup_args; // an array of args that must be passed to the above DHT lookup function to make it perform a value-based lookup
	index_attr; // Some unique string identifier for the attribute that we're indexing with this PHT interface
	rp_data; // Replicatable data, the data we have inserted into the PHT and are responsible for republishing
	ttl; // TTL computed from the DHT's TTL
	refresh_interval_handle;
	
	constructor({index_attr = null, dht_node = null, dht_lookup_func = null, dht_ttl = null, dht_lookup_args = []} = {}) {
		if (typeof index_attr !== "string") {
			throw new TypeError("Argument index_attr must be a string");
		} 

		if (typeof dht_lookup_func !== "function") {
			throw new TypeError("Argument dht_lookup must be a function");
		}

		if (typeof dht_ttl !== "number") {
			throw new TypeError("Argument dht_ttl must be a number");

		}

		if (!Array.isArray(dht_lookup_args)) {
			throw new TypeError("Argument dht_lookup_args must be an Array");
		}
		
		this.dht_node = dht_node;
		this.dht_lookup_func = dht_lookup_func;
		this.dht_lookup_args = dht_lookup_args;
		this.ttl = Math.floor(dht_ttl / 2);
		this.index_attr = index_attr;
		this.rp_data = new Map();
		this.refresh_interval_handle = null;
	}

	// (DEBUG) Print PHT stats - this walks the entire tree and prints everything we know about it
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

	// (DEBUG) Get the root node, or null if we can't find it
	async _debug_get_root_node() {
		return await this._dht_lookup();
	}

	// Retrieve a PHT node from the DHT -- rehydrates and returns the node if found, null if not
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

	// Compute the hash of a PHT node label (the hash of a PHT node label is the key used to locate it in the DHT)
	// We concatenate the index attribute and the PHT node's binary label at hash time, so supplying no arg will
	// get you the label hash of the PHT root node
	_get_label_hash(data = "") {
		if (typeof data !== "string") {
			throw new TypeError("Argument 'data' must be string");
		}

		return new Hbigint(Hutil._sha1(this.index_attr + data));
	}

	// Idempotently start the refresh interval and initialize a new PHT structure, indexing on 'index_attr'
	async init() {
		if (this.refresh_interval_handle === null) {
			this.refresh_interval_handle = setInterval(() => {
				const t1 = Date.now();

				this.rp_data.forEach(async (val, key) => {
					console.log(`[HPHT] Refreshing key ${key}`);
					const k = new Hbigint(key);
					await this.insert(k, val);

					const leaf = await this.lookup_lin(k);

					if (leaf === null) {
						throw new Error("Fatal PHT graph error");
					}

					let plabel = leaf.get_parent_label();

					while (plabel !== null) {
						let parent = await this._dht_lookup(plabel);

						if (parent === null) {
							throw new Error("Fatal PHT graph error");
						}

						if (t1 > parent.get_created() + this.ttl) {
							await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(parent.get_label()), parent);
						} else {
							break;
						}

						plabel = parent.get_parent_label();
					}
				});
			}, this.ttl);
		}

		console.log(`[HPHT] Key refresh interval: ${(this.ttl / 60 / 60 / 1000).toFixed(1)} hours`);

		console.log(`[HPHT] Looking up root node for index attr ${this.index_attr}...`);
		const data = await this._dht_lookup();

		if (data !== null) {
			console.log(`[HPHT] Root node found! Created ${new Date(data.created)}`);
			return;
		}

		console.log(`[HPHT] No root node found! Creating new root structure for index attr ${this.index_attr}...`);
		const root = new Hpht_node({label: ""});
		const res = await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(), root);

		if (!res) {
			console.log(`[HPHT] WARNING! COULD NOT CREATE NEW ROOT STRUCTURE FOR INDEX ATTR ${this.index_attr}!`);
		}
	}

	// Find the PHT leaf node responsible for a given key - linear search edition
	// Returns null if there's no leaf node associated with that key
	async lookup_lin(key) {
		if (!(key instanceof Hbigint)) {
			throw new TypeError("Argument 'key' must be Hbigint");
		}

		const key_str = key.to_bin_str(Hpht.BIT_DEPTH);

		for (let i = 0; i < key_str.length; i += 1) {
			const pht_node = await this._dht_lookup(key_str.substring(0, i));
			
			if (pht_node !== null && pht_node.is_leaf()) {
				return pht_node;
			}
		}

		return null;
	}	

	// Find the PHT leaf node responsible for a given key - binary search edition
	// Returns null if there's no leaf node associated with that key
	async lookup_bin(key) {
		if (!(key instanceof Hbigint)) {
			throw new TypeError("Argument 'key' must be Hbigint");
		}

		let p = 0;
		let r = Hpht.BIT_DEPTH - 1; // Is this off by one?

		const key_str = key.to_bin_str(Hpht.BIT_DEPTH);

		while (p <= r) {
			let q = Math.floor((p + r) / 2);

			const pht_node = await this._dht_lookup(key_str.substring(0, q));

			if (pht_node !== null && pht_node.is_leaf()) {
				return pht_node;
			} else if (pht_node !== null && Hpht_node.valid_magic(pht_node)) {
				p = q + 1;
			} else {
				r = q - 1;
			}	
		}

		return null;
	}

	// Insert a (key, value) pair into the PHT
	async insert(key, val) {
		const leaf = await this.lookup_lin(key);

		// If we can't find the leaf node for a key, our graph is likely corrupted
		// TODO: probably remove me for production?
		if (leaf === null) {
			throw new Error("Fatal PHT graph error");
		}

		if (leaf.get(key) || leaf.size() < Hpht.B) {
			leaf.put(key, val);
			const label_hash = this._get_label_hash(leaf.label);
			await this.dht_node.put.bind(this.dht_node)(label_hash, leaf);
			console.log(`[HPHT] Inserted key ${key.toString()} into PHT index ${this.index_attr}, leaf ${leaf.label} (DHT key ${label_hash})\n`);
		} else {
			// This is the "unlimited split" version of bucket splitting
			// TODO: implement the alternate "staggered updates?"
			const pairs = leaf.get_all_pairs();

			pairs.forEach((pair, i, arr) => {
				arr[i] = [new Hbigint(pair[0]), pair[1]];
			});
			
			pairs.push([key, val]);
			const key_bin_strings = [];

			pairs.forEach((pair) => {
				key_bin_strings.push(pair[0].to_bin_str(Hpht.BIT_DEPTH));
			});

			const i = Hutil._get_lcp(key_bin_strings, true);

			// We need our new child nodes to be one level deeper than the length of the lcp of all B + 1 keys
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
		}

		this.rp_data.set(key.toString(), val);
		// TODO: return true, if we're using the true/false pattern for operations? or return a value if we're using the resolve/reject pattern?
	}
	
	// Delete a key, value pair from the network by key
	async delete(key) {
		const leaf = await this.lookup_lin(key);

		// Key not found
		// TODO: handle this using whatever global pattern we decide on for operation failure
		if (leaf === null) {
			return false;
		}

		// Key not found in the leaf node
		if (!leaf.delete(key)) {
			return;
		}

		const sibling_node = await this._dht_lookup(leaf.get_sibling_label());

		// If we can't find the sibling to a leaf node, our graph is likely corrupted
		// TODO: probably remove me for production?
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

			// d > 0 ensures that we don't delete our level zero (root) node -- but is this necessary?
			while (d > 0 && d > i) {
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

				// Neighbors can be null here -- that just means we reached the left or right terminus of the tree

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

		this.rp_data.delete(key.toString());
		// TODO: return true, if we're using the true/false pattern for operations? or return a value if we're using the resolve/reject pattern?
	}

	// TODO: implement me
	async range_query_1d(minkey, maxkey) {

	}

	// 2D range query assumes that each key is a linearization of some 2D data
	async range_query_2d(minkey, maxkey) {
		async function _do_range_query_2d(pht_node, prefix, data = []) {
			if (pht_node.is_leaf()) {
				return pht_node.get_all_pairs().filter((pair) => {
					const key = new Hbigint(pair[0]);
					return key.greater_equal(minkey) && key.less_equal(maxkey);
				});
			} 

			// Is there any overlap between the rectangular region defined by the subtree's prefix and the range of the original query?
			// TODO: is this an insane way to do this?  Can't we just learn this by comparing the 0's and 1's???
			const min_region = Hbigint.from_base2_str(key_strings[0].substring(0, prefix.length + 1));
			const max_region = Hbigint.from_base2_str(key_strings[1].substring(0, prefix.length + 1));

			const child0_label = `${prefix}0`;
			const child1_label = `${prefix}1`;

			const child0_rect = Hbigint.from_base2_str(child0_label);  
			const child1_rect = Hbigint.from_base2_str(child1_label);

			// TODO: This needs to be parallelized for speed
			if (child0_rect.greater_equal(min_region) && child0_rect.less_equal(max_region)) {
				const child_node = await this._dht_lookup(child0_label);

				if (child_node === null) {
					throw new Error("Fatal PHT graph error");
				}

				data = data.concat(await _do_range_query_2d.bind(this)(child_node, child0_label, data));
			}

			if (child1_rect.greater_equal(min_region) && child1_rect.less_equal(max_region)) {
				const child_node = await this._dht_lookup(child1_label);

				if (child_node === null) {
					throw new Error("Fatal PHT graph error");
				}

				data = data.concat(await _do_range_query_2d.bind(this)(child_node, child1_label, data));
			}
			
			return data;
		}

		// *** BEGIN ***

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