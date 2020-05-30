/** 
* HKAD_NODE
* An HKAD_NODE is the nucleus of HKAD
* It implements the Kademlia protocol and wires together an HKAD_ENG
* with an HKAD_NET to provide a message engine and network I/O 
*
*
*/ 

"use strict";

const crypto = require("crypto");
const { Hutil } = require("../hutil/hutil.js");
const { Hkad_net } = require("./net/hkad_net.js");
const { Hkad_eng } = require("./eng/hkad_eng.js");
const { Hkad_node_info } = require("./hkad_node_info.js");
const { Hkad_kbucket } = require("./hkad_kbucket.js");
const { Hkad_msg } = require("./hkad_msg.js");
const { Hkad_ds } = require("./hkad_ds.js");
const { Hkad_data } = require("./hkad_data.js");
const { Hbintree } = require("../htypes/hbintree/hbintree.js");
const { Hbintree_node } = require("../htypes/hbintree/hbintree_node.js");
const { Hbigint } = require("../htypes/hbigint/hbigint_node.js");

class Hkad_node {
	static DHT_BIT_WIDTH = 160;
	static ID_LEN = this.DHT_BIT_WIDTH / Hutil.SYS_BYTE_WIDTH;
	static K_SIZE = 20;
	static ALPHA = 3;
	static T_KBUCKET_REFRESH = 1000 * 60 * 60; // How often do we check for pathological stale k-bucket cases and force a refresh on them?
	static T_DATA_TTL = (1000 * 60 * 60 * 24) + (1000 * 20); // How long does data live on this network? Include grace period to prevent race condition with T_REPUBLISH
	static T_REPUBLISH = 1000 * 60 * 60 * 24; // How often do we republish data that we are the original publishers of? (We must republish before T_DATA_TTL or our data will get wiped)
	static T_REPLICATE = 1000 * 60 * 60; // How often do we republish our entire data store?
	
	net;
	eng;
	node_id;
	node_info;
	routing_table;
	refresh_interval_handle;
	republish_interval_handle;
	data;

	RPC_RES_EXEC = new Map([
		[Hkad_msg.RPC.PING, this._res_ping],
		[Hkad_msg.RPC.STORE, this._res_store],
		[Hkad_msg.RPC.FIND_NODE, this._res_find_node],
		[Hkad_msg.RPC.FIND_VALUE, this._res_find_value]
	]);

	// net must be an Hkad_net net module, eng must be an Hkad_eng eng module
	// addr and port must be the values that the outside world needs to contact this node
	// (if this isn't meant to be a bootstrap node, you probably want to do NAT traversal first)
	// WARNING: nothing prevents you from creating an ID collision! Don't create an ID collision.
	constructor({net = null, eng = null, addr = null, port = null, id = null} = {}) {
		if (!(net instanceof Hkad_net)) {
			throw new TypeError("Argument 'net' must be instance of Hkad_net");
		}

		if (!(eng instanceof Hkad_eng)) {
			throw new TypeError("Argument 'eng' must be instance of Hkad_eng");
		}

		this.refresh_interval_handle = null;
		this.republish_interval_handle = null;

		this.net = net;
		this.eng = eng;

		this.node_id = id || Hkad_node.generate_random_key_between(); // You sure you wanna be able to do this bro?

		// SO! Your node info actually should be set first thing during bootstrapping -- the boostrap process should go like this:
		// first send a STUN request, set our node_info with our external IP and port, and then initiate the Kademlia bootstrap process
		// but for our first one-machine network tests, we'll just manually supply a port...
		this.node_info = new Hkad_node_info({addr: addr, port: port, node_id: new Hbigint(this.node_id)});

		// Here's the new bro
		this.routing_table = new Hbintree();
		this.routing_table.get_root().set_data(new Hkad_kbucket({max_size: Hkad_node.K_SIZE, prefix: ""}));

		this.network_data = new Hkad_ds();
		this.rp_data = new Hkad_ds();

		// Both of the below practices need to be examined and compared to each other for consistency of philosophy - how much does each module need to be aware of other modules' interfaces?
		this.eng.node = this; // We reach out to the message engine to give it a reference to ourself, currently just so that the message engine can reach back and get our net module reference and call its out() method
		this.net.node = this; // Ditto for the net module
		this.net.network.on("message", this.eng._on_message.bind(this.eng)) // Here we have the node wire up the network module to the message engine - kinda cool, but maybe too complex and not loosely coupled enough?
	}

	// Get XOR "distance" between two Hbigint values
	static _get_distance(key1, key2) {
		return key1.xor(key2);
	}

	// min and max are the log2 of your desired integer range: 2^min - 2^max
	// TODO: This is cryptographically insecure and pretty crappy
	// Let's figure out how to do this properly when we implement a real portable system that doesn't realy on BigInts
	static generate_random_key_between(min = 0, max = this.DHT_BIT_WIDTH) {
		let min_bigint = (new Hbigint(2)).pow(new Hbigint(min));
		const max_bigint = (new Hbigint(2)).pow(new Hbigint(max));
		const diff = max_bigint.sub(min_bigint);
		const bits_needed = Math.max(Hutil._log2(diff), 1);
		const bytes_needed = Math.ceil(bits_needed / Hutil.SYS_BYTE_WIDTH);
		const extra_bits = (bytes_needed * Hutil.SYS_BYTE_WIDTH) - bits_needed;
		const random_bytes_buf = crypto.randomBytes(bytes_needed);
		random_bytes_buf[0] &= (0xFF >> extra_bits);

		return min_bigint.add(new Hbigint(random_bytes_buf.toString("hex")));
	}

	// Prints DFS
	_debug_print_routing_table() {
		console.log(`\n******************************************`);
		console.log(`[HKAD] HKAD_NODE _DEBUG_PRINT_ROUTING_TABLE:`);

		this.routing_table.dfs((node, data) => {
			const bucket = node.get_data();
			
			if (bucket !== null) {
				console.log(`[HKAD] prefix "${bucket.get_prefix()}" - ${bucket.length()} contacts`);
			}
		});
	}

	// Here's the idea: The point of refreshing a bucket is to force some fresh traffic of contacts that are hopefully within the bucket's range, such that our _update_routing_table function
	// evicts some contacts and inserts some new ones. To that end, we select a "random ID in the bucket's range" and do a node lookup on it -- asking our peers to tell us what are the K
	// nodes they know about that are the closest to that ID. To get a "random ID in the bucket's range," we can just select the ID of a random node in the bucket - though it might be more
	// rigorous to generate a random ID in the bucket's range, as our peers might know about nodes that are closer to some undefined value than they are to the nodes we already know about.
	async _refresh_kbucket(kbucket) {
		const random_id = kbucket.get(Math.floor(Math.random() * kbucket.length())).node_id;
		console.log(`[HKAD] Refreshing k-bucket for range including ID ${random_id.toString()}`);
		await this._node_lookup(random_id);
	}

	// Find the appropriate leaf node in the routing table for a given node ID
	find_kbucket_for_id(id) {
		let node = this.routing_table.get_root();
		let i = 0;

		// TODO: I think this can be simplified, since our tree seems to be a perfect tree -- leafs always split into two children
		// so we don't need to know the value of b before we enter the loop - we can just say "while this node's children are not null, keep going"
		while (true) {
			const b = id.get_bit(i);

			if (node.get_child_bin(b) === null) {
				break;
			}

			node = node.get_child_bin(b);
			i += 1;
		}

		return node;
	}

	_update_routing_table(inbound_node_info) {
		let leaf_node = this.find_kbucket_for_id(inbound_node_info.node_id);
		let bucket = leaf_node.get_data();
		const node_info = bucket.exists(inbound_node_info.node_id);

		if (node_info !== null) {
			// We've already seen this node in this bucket, so just move it to the tail
			bucket.delete(node_info);
			bucket.enqueue(inbound_node_info);
		} else if (node_info === null && !bucket.is_full()) {
			// We've never seen this node and the appropriate bucket isn't full, so just insert it
			bucket.enqueue(inbound_node_info);
		} else {
			// We've never seen this node but the appropriate bucket is full
			const our_bucket = this.find_kbucket_for_id(this.node_id).get_data();

			if (bucket === our_bucket) {
				// The incoming node_info's bucket's range includes our ID, so split the bucket
				const left_child = new Hbintree_node({
					parent: leaf_node, 
					data: new Hkad_kbucket({max_size: Hkad_node.K_SIZE, prefix: `${bucket.get_prefix()}0`})
				});

				const right_child = new Hbintree_node({
					parent: leaf_node,
					data: new Hkad_kbucket({max_size: Hkad_node.K_SIZE, prefix: `${bucket.get_prefix()}1`})
				});

				leaf_node.set_left(left_child);
				leaf_node.set_right(right_child);
				leaf_node.set_data(null);

				// Redistribute the node_infos from the old bucket to the new leaves
				bucket.to_array().forEach((node_info) => {
					const b = node_info.node_id.get_bit(bucket.get_prefix().length);
					leaf_node.get_child_bin(b).get_data().enqueue(node_info);
				});

				// Attempt reinsertion
				this._update_routing_table(inbound_node_info);
			} else {
				// This is the confusing/contradictory case - either we're supposed to just discard the new contact, or we're supposed to ping the oldest contact 
				// in the bucket (below) to decide if we evict/replace or discard 
				// NO, YOU KNOW WHAT IT IS? 
				// per the optimizations in section 4.1, you're actually not supposed to do the ping for every new contact --
				// instead, you're supposed to add the new contact to the "replacement cache" and then do a lazy replacement the next time you need to access the bucket
			}
		}
	}

	// BRO, we need to make sure keys are strings when they need to be strings and BigInt objects when they need to be BigInt objects
	_node_lookup(key, find_rpc = this._req_find_node) {
		return new Promise((resolve_node_lookup, reject_node_lookup) => {
			function _do_node_lookup(res, ctx) {
				// We preapply one of the Promise arguments to this callback, so res and ctx are shifted 
				const resolve_find_nodes = arguments[0];
				res = arguments[1];
				ctx = arguments[2];

				// If we received a value type, that means this was a FIND instruction and we received the jackpot - terminate immediately
				if (res.data.type === Hkad_data.TYPE.VAL) {
					resolve_node_lookup(new Hkad_data({type: Hkad_data.TYPE.VAL, payload: res.data.payload}));
					return;

					// TODO: Are we worried about any unresolved promises we may have left dangling?
				}

				// We've heard back from a node (the sender is in the res.from field). 
				// If it's already in our map, let's update it to be queried
				// If it's not already in our map, let's add it as a queried node

				// *** This exploits the JavaScript map property that inserting a value with the same key will just overwrite it
				const sender = res.from;
				sender.queried = true;
				node_map.set(Hkad_node._get_distance(key, res.from.node_id).toString(), sender);

				// Now we want to deal with the list of nodes that the sender has given us, and we want to add them to our map if they're unique
				// Again exploit the map property that we can just overwrite old keys
				res.data.payload.forEach((node_info) => {
					// No - you actually don't want to stomp the node with a false queried value, because it's possible someone's giving
					// us a node in a list that we've already talked to and we want to retain its queried status

					const existing_node = node_map.get(Hkad_node._get_distance(key, node_info.node_id).toString());

					if (!existing_node) {
						node_info.queried = false;
						node_map.set(Hkad_node._get_distance(key, node_info.node_id).toString(), node_info);
					}
				});

				// Now we set up for the recursion:  
				// Pick the ALPHA closest nodes from the node map that we have not yet queried and send each of them a find_node request
				// This is very slow: we coerce a hashmap into an array and then sort the array, recalculating distance twice per comparison
				const sorted = Array.from(node_map.values()).sort((a, b) => {
					return Hkad_node._get_distance(key, a.node_id).greater(Hkad_node._get_distance(key, b.node_id)) ? 1 : -1;
				});

				// THE NEW MAP IS SET HERE - SO THIS IS WHERE THE FUNCTION WOULD RESOLVE IF WE'RE WAITING FOR ALL 3

				if (typeof resolve_find_nodes === "function") {
					resolve_find_nodes();
				}
				
				const our_current_k_size_bro = ctx._new_get_nodes_closest_to(key, Hkad_node.K_SIZE).length;

				// Wow this is terrible
				// It's how we handle the base case: If all SIZE_K of the closest nodes in our node map have been queried, then we're done
				// and we should return all SIZE_K of the nodes in our node map
				
				// You should just be able to do this with one splice statement
				const returnable = [];

				for (let i = 0; i < our_current_k_size_bro && i < sorted.length; i += 1) {
					if (sorted[i].queried) {
						returnable.push(sorted[i]);
					}
				}

				// console.log(`${returnable.length} - ${our_current_k_size_bro}`)
				// console.log(ctx._new_get_nodes_closest_to(key, Hkad_node.K_SIZE))

				if (returnable.length >= our_current_k_size_bro) {
					resolve_node_lookup(new Hkad_data({type: Hkad_data.TYPE.NODE_LIST, payload: returnable}));
					return;
				}

				// Now we want the ALPHA number of unqueried nodes in the closest SIZE_K number of nodes in our node_map
				// NOTE: similar to the "hail mary" condition below, there's some ambiguity in the paper -- when we 
				// look for the closest unqueried nodes to query next, do we consider the entire length of node_map, or 
				// do we essentially think about node_map as being a fixed length equal to our current SIZE_K?
				const node_infos = [];

				for (let i = 0; i < sorted.length && i < our_current_k_size_bro && node_infos.length < Hkad_node.ALPHA; i += 1) {
					if (!sorted[i].queried) {
						node_infos.push(sorted[i]);
					}
				}

				const closest_bro = Hkad_node._get_distance(key, sorted[0].node_id);
				const resolutions = [];

				node_infos.forEach((node_info) => {
					resolutions.push(new Promise((resolve, reject) => {
						ctx[find_rpc.name](key, node_info, _do_node_lookup.bind(this, resolve), () => { // Weird thing we should test - we also pass resolve
							resolve();																      // to the failure callback, because we want to use
						});																				  // Promise.all() to test for their completion
					}));
				});

				// If a full round of find_node instructions has failed to find a node that's any closer than the closest one we'd previously seen,
				// we send a round of find_node instructions to all of the SIZE_K nodes we haven't already queried
				// TODO: Is this "hail mary" round supposed to trigger recursions?  I mean, I think so, right?
				Promise.all(resolutions).then((values) => {
					const new_sorted = Array.from(node_map.values()).sort((a, b) => {
						return Hkad_node._get_distance(key, a.node_id).greater(Hkad_node._get_distance(key, b.node_id)) ? 1 : -1;
					});

					// Here we check the hail mary condition
					if (Hkad_node._get_distance(key, new_sorted[0].node_id) >= closest_bro) {
						const current_k_number = ctx._new_get_nodes_closest_to(key, Hkad_node.K_SIZE).length;
						const k_closest_nodes_we_havent_queried = [];

						// TODO: I'm not sure what the original paper calls for: Is our node_map supposed to max out at SIZE_K items?
						// or are we always supposed to consider an unbounded list of unqueried nodes?
						// This also applies above where we look for unqueried nodes in the map -- if we limit it to the first SIZE_K 
						// items, we effectively decide that the node_map is a fixed length of SIZE_K items
						for (let i = 0; i < new_sorted.length && i < current_k_number && k_closest_nodes_we_havent_queried.length < current_k_number; i += 1) {
							if (!new_sorted[i].queried) {
								k_closest_nodes_we_havent_queried.push(new_sorted[i]);
							}
						}

						if (k_closest_nodes_we_havent_queried.length > 0 ) {
							// console.log("WE FOUND A HAIL MARY CASE, HERE'S HOW MANY NODES WE HAVEN'T QUERIED: " + k_closest_nodes_we_havent_queried.length)
						}	
						

						k_closest_nodes_we_havent_queried.forEach((node_info) => {
							this[find_rpc.name](key, node_info, _do_node_lookup.bind(this, null));
						});
					}
				});
			}

			const node_infos = this._new_get_nodes_closest_to(key, Hkad_node.ALPHA);

			// console.log(key)
			// console.log(node_infos);


			const node_map = new Map();
			
			node_infos.forEach((node_info) => {
				this[find_rpc.name](key, node_info, _do_node_lookup.bind(this, null));
			});
		});
	}

	// How our RPC req/res system works:
	// If you want to make an RPC req, you call the appropriate RPC function and specify what you want to want to do with the response in a callback -- 
	// your Heng module is responsible for figuring out how to keep track of the process (some Heng modules might keep messages as state in a queue and implement GC for timeouts, some might just use promises...)
	// Similarly, your Heng module is responsible for determining what is an incoming RPC req for us to answer, and it forwards it to our _on_req() function
	_req_ping(node_info, success, timeout) {
		const msg = new Hkad_msg({
			rpc: Hkad_msg.RPC.PING,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.REQ,
			id: Hkad_node.generate_random_key_between()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_store(key, val, node_info, success, timeout) {
		const msg = new Hkad_msg({
			rpc: Hkad_msg.RPC.STORE,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.REQ,
			data: new Hkad_data({type: Hkad_data.TYPE.PAIR, payload: [key, val]}),
			id: Hkad_node.generate_random_key_between()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_find_node(key, node_info, success, timeout) {
		const msg = new Hkad_msg({
			rpc: Hkad_msg.RPC.FIND_NODE,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.REQ,
			data: new Hkad_data({type: Hkad_data.TYPE.KEY, payload: [key]}),
			id: Hkad_node.generate_random_key_between()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_find_value(key, node_info, success, timeout) {
		const msg = new Hkad_msg({
			rpc: Hkad_msg.RPC.FIND_VALUE,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.REQ,
			data: new Hkad_data({type: Hkad_data.TYPE.KEY, payload: [key]}),
			id: Hkad_node.generate_random_key_between()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_res_ping(req) {
		return new Hkad_msg({
			rpc: Hkad_msg.RPC.PING,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.RES,
			data: new Hkad_data({type: Hkad_data.TYPE.STRING, payload: ["PONG"]}),
			id: req.id
		});
	}

	_res_store(req) {
		this.network_data.put({
			key: req.data.payload[0].toString(),
			val: req.data.payload[1],
			ttl: Hkad_node.T_DATA_TTL
		});

		return new Hkad_msg({
			rpc: Hkad_msg.RPC.STORE,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.RES,
			data: new Hkad_data({type: Hkad_data.TYPE.STRING, payload: ["OK"]}),
			id: req.id
		});
	}

	_res_find_node(req) {
		const nodes = this._new_get_nodes_closest_to(req.data.payload[0], Hkad_node.K_SIZE);

		return new Hkad_msg({
			rpc: Hkad_msg.RPC.FIND_NODE,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.RES,
			data: new Hkad_data({type: Hkad_data.TYPE.NODE_LIST, payload: nodes}),
			id: req.id
		});
	}

	_res_find_value(req) {
		let payload;
		let type;

		const ds_rec = this.network_data.get(req.data.payload[0].toString());

		if (ds_rec) {
			payload = [ds_rec.get_data()];
			type = Hkad_data.TYPE.VAL;
		} else {
			payload = this._new_get_nodes_closest_to(req.data.payload[0], Hkad_node.K_SIZE);
			type = Hkad_data.TYPE.NODE_LIST;
		}

		return new Hkad_msg({
			rpc: Hkad_msg.RPC.FIND_VALUE,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.RES,
			data: new Hkad_data({type: type, payload: payload}),
			id: req.id
		});
	}

	_on_req(msg) {
		const res = this.RPC_RES_EXEC.get(msg.rpc).bind(this)(msg);
		this.eng._send(res, msg.from)
	}

	// Simplest unoptimized solution: collect all the nodes we know about by performing
	// an arbitrary traversal of the entire routing table (we do DFS here), sort nodes by 
	// distance from the key and return the min of the 'max' argument and the length of the collected nodes
	// TODO: This can be optimized by starting our search at the leaf node and visiting 
	// adjacent buckets in the routing table that are mathematically closest to us,
	// ending the search when our collected nodes have reached or exeeced 'max' -- then we
	// sort the collected nodes by distance from the key and return the correct amount
	_new_get_nodes_closest_to(key, max = Hkad_node.K_SIZE) {
		// Touch the bucket so we know it's not a pathological case
		this.find_kbucket_for_id(key).get_data().touch();

		const all_nodes = this.routing_table.dfs((node, data) => {
			const bucket = node.get_data();
			
			if (bucket !== null) {
				data = data.concat(bucket.to_array());
			}

			return data;
		});

		all_nodes.sort((a, b) => {
			return Hkad_node._get_distance(key, a.node_id).greater(Hkad_node._get_distance(key, b.node_id)) ? 1 : -1;
		});

		return all_nodes.splice(0, Math.min(max, all_nodes.length));
	}

	// **** PUBLIC API ****

	async bootstrap({addr = null, port = null, node_id = null} = {}) {
		// You can bootstrap with an addr + port OR just an ID
		// You'd use an ID for local testing
		// This is crap code and needs to be cleaned up
		let node_info;

		if (addr === null && port === null && node_id instanceof Hbigint) {
			node_info = new Hkad_node_info({addr: addr, port: port, node_id: node_id});
		} else {
			// Here's another case where we have to wrap an RPC in a promise because we didn't implement them as async functions...
			// Is it worth rethinking?
			node_info = await new Promise((resolve, reject) => {
				// Why the -1 Hbigint? Well, we always want to include a node_id in a node_info that we pass to an RPC primitive
				// That's because Hkad_net may check an outgoing message's node_id to see if we're trying to send a message to ourself
				this._req_ping({addr: addr, port: port, node_id: new Hbigint(-1)}, (res, ctx) => {
					resolve(res.from);
				}, () => {
					resolve(null);
				});
			});
		}
		
		console.log(`[HKAD] Joining network as ${this.node_id.toString()} via bootstrap node ${addr}:${port}...`);

		if (node_info === null) {
			console.log(`[HKAD] No PONG from bootstrap node ${addr}:${port}`);
			return false;
		}	

		// const d = Hkad_node._get_distance(node_info.node_id, this.node_id);
		// const b = Hutil._log2(d);

		// You never want to call the _push() method of hkad_kbucket without first checking if the node exists() first...
		// We prob want to create an Hkbucket function that wraps both operations in one and use that one exclusively
		// const bucket = this.get_kbucket(b);

		const bucket = this.find_kbucket_for_id(node_info.node_id).get_data();

		// This is now redundant, scrutinize
		if (!bucket.exists(node_info.node_id)) {
			bucket.enqueue(node_info);
		}

		// Now do a node lookup for my own ID and refresh every k-bucket further away than the closest neighbor I found
		
		const result = await this._node_lookup(this.node_id);
		const closest_to_me_sorted = result.payload;

		// Here's our plan: get all of our neighbors in a sorted list.  Then find the first index in the list that isn't my own node ID
		// (since I may appear in the list as the closest node to my own ID...)
		// Increment i again by one to skip our closest neighbor
		// Then, for all the remaining nodes, get their associated buckets and collect them as unique entries in a Set
		// Then do refreshes on all those buckets

		let i = 0;

		// We never evaluate the last element of closest_to_me_sorted - that's OK, because it's either a not-us node_id (we want it) or
		// all the previous node_id's were our node_id AND the last element is also our node_id, which means we take it either way
		while (i < closest_to_me_sorted.length - 1 && closest_to_me_sorted[i].node_id.equals(this.node_id)) {
			i += 1;
		}

		// i now points to my closest neighbor, so skip that dude
		i += 1

		const buckets_to_refresh = new Set();

		while (i < closest_to_me_sorted.length) {
			buckets_to_refresh.add(this.find_kbucket_for_id(closest_to_me_sorted[i].node_id).get_data());
			i += 1
		}	

		buckets_to_refresh.forEach((bucket) => {
			this._refresh_kbucket(bucket);
		});

		console.log(`[HKAD] Success: node ${this.node_id.toString()} is online! (At least ${this._new_get_nodes_closest_to(this.node_id).length} peers found)`);
		console.log(`[HKAD] K-bucket refresh interval: ${(Hkad_node.T_KBUCKET_REFRESH / 60 / 60 / 1000).toFixed(1)} hours`);
		console.log(`[HKAD] Data republish interval ${(Hkad_node.T_REPUBLISH / 60 / 60 / 1000).toFixed(1)} hours`);

		// Maybe these kinds of initialization things below can be moved to an _init() function
		
		// Idempotently start the bucket refresh interval
		if (this.refresh_interval_handle === null) {
			this.refresh_interval_handle = setInterval(() => {
				const t1 = Date.now() - Hkad_node.T_KBUCKET_REFRESH;

				const all_buckets = this.routing_table.dfs((node, data) => {
					const bucket = node.get_data();

					if (bucket !== null) {
						data.push(bucket);
					}

					return data;
				});
			
				all_buckets.forEach((bucket) => {
					if (bucket.get_touched() < t1) {
						this._refresh_kbucket(bucket);
					}
				});
			}, Hkad_node.T_KBUCKET_REFRESH);
		}

		// Idempotently start the data republish interval
		if (this.republish_interval_handle === null) {
			this.republish_interval_handle = setInterval(() => {
				this.rp_data.forEach((val, key) => {
					this.put(key, val, true);
				});
			}, Hkad_node.T_REPUBLISH);
		}

		// TODO:  Resolve with a result?
		return true;
	}

	async put(key, val, rp = false) {
		if (rp) {
			this.rp_data.put({
				key: key,
				val: val,
				ttl: Hkad_node.T_DATA_TTL
			});
		}

		const result = await this._node_lookup(key);
		const kclosest = result.payload;
		const resolutions = [];
		let successful = 0;

		kclosest.forEach((node_info) => {
			resolutions.push(new Promise((resolve, reject) => {
				this._req_store(key, val, node_info, (res, ctx) => {
					successful += 1;
					resolve();
				}, () => {
					resolve();
				});
			}));
		});

		await Promise.all(resolutions);
		// console.log(`[HKAD] PUT key ${key.toString()} (${successful} / ${resolutions.length} OK)`)
		return successful > 0 ? true : false;
	}

	async get(key) {
		const result = await this._node_lookup(key, this._req_find_value);
		return result;
	}

	delete(key) {
		return this.rp_data.delete(key);
	}
}

module.exports.Hkad_node = Hkad_node;