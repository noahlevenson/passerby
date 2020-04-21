const crypto = require("crypto");
const { Hutil } = require("../hutil/hutil.js"); // Hutil is correctly named because its a top level module - the rest below need to be renamed 
const { Hnode_info } = require("./hnode_info.js");
const { Hkbucket } = require("./hkbucket.js");
const { Hmsg } = require("./hmsg.js");
const { Hdata } = require("./hdata.js");

// A hoodnet Kademlia DHT node
class Hnode {
	static DHT_BIT_WIDTH = 160;
	static ID_LEN = this.DHT_BIT_WIDTH / Hutil.SYS_BYTE_WIDTH;
	static K_SIZE = 20;
	static ALPHA = 3;

	trans;
	eng;
	node_id;
	node_info;
	kbuckets;
	data;
	RPC_RES_EXEC = new Map([
		[Hmsg.RPC.PING, this._res_ping],
		[Hmsg.RPC.STORE, this._res_store],
		[Hmsg.RPC.FIND_NODE, this._res_find_node],
		[Hmsg.RPC.FIND_VALUE, this._res_find_value]
	]);

	constructor({trans = null, eng = null} = {}) {
		// TODO: validate that the transport and message eng module are instances of the correct base classes and implement the functionality we rely on
		this.trans = trans;
		this.eng = eng;
		this.node_id = Hnode.generate_random_key_between();  // This is just a temp hack!! Node IDs must be generated properly bro!
		this.node_info = new Hnode_info({ip_addr: "127.0.0.1", udp_port: 31337, node_id: BigInt(this.node_id)});

		this.kbuckets = new Map(); // Is it more accurate to call this the routing table?
		
		for (let i = 0; i < Hnode.DHT_BIT_WIDTH; i += 1) {
			this.kbuckets.set(i, new Hkbucket({size: Hnode.K_SIZE}));
		}

		// This is our local data store -- I guess we're rehashing keys but whatever
		this.data = new Map();

		// Both of the below practices need to be examined and compared to each other for consistency of philosophy - how much does each module need to be aware of other modules' interfaces?
		this.eng.node = this; // We reach out to the message engine to give it a reference to ourself, currently just so that the message engine can reach back and get our transport reference and call its out() method
		this.trans.network.on("message", this.eng._on_message.bind(this.eng)) // Here we have the node wire up the transport to the message engine - kinda cool, but maybe too complex and not loosely coupled enough?
	}

	static _get_distance(key1, key2) {
		return key1 ^ key2;
	}

	// min and max are the log2 of your desired integer range: 2^min - 2^max
	// TODO: This is cryptographically insecure and pretty crappy
	// Let's figure out how to do this properly when we implement a real portable system that doesn't realy on BigInts
	static generate_random_key_between(min = 0, max = this.DHT_BIT_WIDTH) {
		let min_bigint = 2n ** BigInt(min);
		const max_bigint = 2n ** BigInt(max);
		const diff = max_bigint - min_bigint;

		const bits_needed = Hutil._log2(diff) || 1;
		const bytes_needed = Math.ceil(bits_needed / Hutil.SYS_BYTE_WIDTH);
		const extra_bits = (bytes_needed * Hutil.SYS_BYTE_WIDTH) - bits_needed;
		const random_bytes_buf = crypto.randomBytes(bytes_needed);

		random_bytes_buf[0] &= (0xFF >> extra_bits);

		return min_bigint + BigInt(`0x${random_bytes_buf.toString("hex")}`);
	}

	get_kbucket(i) {
		return this.kbuckets.get(i);
	}

	async _refresh_kbucket(b) {
		// To refresh k-bucket 20 means to pick a random key in the range of 2^20 - 2^21 and do a "node search" on it -- which I'm assuming means do a node lookup? (as opposed to a find_node?) 
		// because a find_node is a directed RPC 
		const random_id = Hnode.generate_random_key_between(b, b + 1);
		await this._node_lookup(random_id);
	}

	_update_kbucket(msg) {
		const d = Hnode._get_distance(msg.from.node_id, this.node_id);
		const b = Hutil._log2(d);
		const bucket = this.get_kbucket(b);

		// I'm worried about a race condition here
		const i = bucket.exists(msg.from);

		if (i !== null) {
			bucket.move_to_tail(i);
			return;
		}

		if (!bucket.is_full()) {
			bucket._push(msg.from);
			return;
		}

		this._req_ping(bucket.at(0), (res, ctx) => {
			const d = Hnode._get_distance(res.from.node_id, ctx.node_id);
			const b = Hutil._log2(d);
			const bucket = ctx.get_kbucket(b);

			const i = bucket.exists(res.from);

			if (i !== null) {
				bucket.move_to_tail(i);
			}
		}, () => {
			bucket._push(msg.from);
		});
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
				if (res.data.type === Hdata.TYPE.VAL) {
					resolve_node_lookup(new Hdata({type: Hdata.TYPE.VAL, payload: res.data.payload}));
					return;

					// TODO: Are we worried about any unresolved promises we may have left dangling?
				}

				// We've heard back from a node (the sender is in the res.from field). 
				// If it's already in our map, let's update it to be queried
				// If it's not already in our map, let's add it as a queried node

				// *** This exploits the JavaScript map property that inserting a value with the same key will just overwrite it
				const sender = res.from;
				sender.queried = true;
				node_map.set(Hnode._get_distance(key, res.from.node_id).toString(16), sender);

				// Now we want to deal with the list of nodes that the sender has given us, and we want to add them to our map if they're unique
				// Again exploit the map property that we can just overwrite old keys
				res.data.payload.forEach((node_info) => {
					// No - you actually don't want to stomp the node with a false queried value, because it's possible someone's giving
					// us a node in a list that we've already talked to and we want to retain its queried status

					const existing_node = node_map.get(Hnode._get_distance(key, node_info.node_id).toString(16));

					if (!existing_node) {
						node_info.queried = false;
						node_map.set(Hnode._get_distance(key, node_info.node_id).toString(16), node_info);
					}
				});

				// Now we set up for the recursion:  
				// Pick the ALPHA closest nodes from the node map that we have not yet queried and send each of them a find_node request
				// This is very slow: we coerce a hashmap into an array and then sort the array, recalculating distance twice per comparison
				const sorted = Array.from(node_map.values()).sort((a, b) => {
					return Hnode._get_distance(key, a.node_id) > Hnode._get_distance(key, b.node_id) ? 1 : -1;
				});

				// THE NEW MAP IS SET HERE - SO THIS IS WHERE THE FUNCTION WOULD RESOLVE IF WE'RE WAITING FOR ALL 3

				if (typeof resolve_find_nodes === "function") {
					resolve_find_nodes();
				}
				
				const our_current_k_size_bro = ctx._get_nodes_closest_to(key, Hnode.K_SIZE).length;

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

				if (returnable.length >= our_current_k_size_bro) {
					resolve_node_lookup(new Hdata({type: Hdata.TYPE.NODE_LIST, payload: returnable}));
					return;
				}

				// Now we want the ALPHA number of unqueried nodes in the closest SIZE_K number of nodes in our node_map
				// NOTE: similar to the "hail mary" condition below, there's some ambiguity in the paper -- when we 
				// look for the closest unqueried nodes to query next, do we consider the entire length of node_map, or 
				// do we essentially think about node_map as being a fixed length equal to our current SIZE_K?
				const node_infos = [];

				for (let i = 0; i < sorted.length && i < our_current_k_size_bro && node_infos.length < Hnode.ALPHA; i += 1) {
					if (!sorted[i].queried) {
						node_infos.push(sorted[i]);
					}
				}

				const closest_bro = Hnode._get_distance(key, sorted[0].node_id);
				const resolutions = [];

				node_infos.forEach((node_info) => {
					resolutions.push(new Promise((resolve, reject) => {
						ctx[find_rpc.name](key, node_info, _do_node_lookup.bind(this, resolve), (resolve) => { // Weird thing we should test - we also pass resolve
							resolve();																      // to the failure callback, because we want to use
						});																				  // Promise.all() to test for their completion
					}));
				});

				// If a full round of find_node instructions has failed to find a node that's any closer than the closest one we'd previously seen,
				// we send a round of find_node instructions to all of the SIZE_K nodes we haven't already queried
				// TODO: Is this "hail mary" round supposed to trigger recursions?  I mean, I think so, right?
				Promise.all(resolutions).then((values) => {
					const new_sorted = Array.from(node_map.values()).sort((a, b) => {
						return Hnode._get_distance(key, a.node_id) > Hnode._get_distance(key, b.node_id) ? 1 : -1;
					});

					// Here we check the hail mary condition
					if (Hnode._get_distance(key, new_sorted[0].node_id) >= closest_bro) {
						const current_k_number = ctx._get_nodes_closest_to(key, Hnode.K_SIZE).length;
						const k_closest_nodes_we_havent_queried = [];

						// TODO: I'm not sure what the original paper calls for: Is our node_map supposed to max out at SIZE_K items?
						// or are we always supposed to consider an unbounded list of unqeried nodes?
						// This also applies above where we look for unqueried nodes in the map -- if we limit it to the first SIZE_K 
						// items, we effectively decide that the node_map is a fixed length of SIZE_K items
						for (let i = 0; i < new_sorted.length && i < current_k_number && k_closest_nodes_we_havent_queried.length < current_k_number; i += 1) {
							if (!new_sorted[i].queried) {
								k_closest_nodes_we_havent_queried.push(new_sorted[i]);
							}
						}

						if (k_closest_nodes_we_havent_queried.length > 0 ) {
							console.log("WE FOUND A HAIL MARY CASE, HERE'S HOW MANY NODES WE HAVEN'T QUERIED: " + k_closest_nodes_we_havent_queried.length)
						}	
						

						k_closest_nodes_we_havent_queried.forEach((node_info) => {
							this[find_rpc.name](key, node_info, _do_node_lookup.bind(this, null));
						});
					}
				});
			}

			const node_infos = this._get_nodes_closest_to(key, Hnode.ALPHA);
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
		const msg = new Hmsg({
			rpc: Hmsg.RPC.PING,
			from: new Hnode_info(this.node_info),
			type: Hmsg.TYPE.REQ,
			id: Hnode.generate_random_key_between()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_store(key, val, node_info, success, timeout) {
		const msg = new Hmsg({
			rpc: Hmsg.RPC.STORE,
			from: new Hnode_info(this.node_info),
			type: Hmsg.TYPE.REQ,
			data: new Hdata({type: Hdata.TYPE.PAIR, payload: [key, val]}),
			id: Hnode.generate_random_key_between()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_find_node(key, node_info, success, timeout) {
		const msg = new Hmsg({
			rpc: Hmsg.RPC.FIND_NODE,
			from: new Hnode_info(this.node_info),
			type: Hmsg.TYPE.REQ,
			data: new Hdata({type: Hdata.TYPE.KEY, payload: [key]}),
			id: Hnode.generate_random_key_between()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_find_value(key, node_info, success, timeout) {
		const msg = new Hmsg({
			rpc: Hmsg.RPC.FIND_VALUE,
			from: new Hnode_info(this.node_info),
			type: Hmsg.TYPE.REQ,
			data: new Hdata({type: Hdata.TYPE.KEY, payload: [key]}),
			id: Hnode.generate_random_key_between()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_res_ping(req) {
		return new Hmsg({
			rpc: Hmsg.RPC.PING,
			from: new Hnode_info(this.node_info),
			type: Hmsg.TYPE.RES,
			data: new Hdata({type: Hdata.TYPE.STRING, payload: ["PONG"]}),
			id: req.id
		});
	}

	_res_store(req) {
		this.data.set(req.data.payload[0].toString(16), req.data.payload[1]);

		return new Hmsg({
			rpc: Hmsg.RPC.STORE,
			from: new Hnode_info(this.node_info),
			type: Hmsg.TYPE.RES,
			data: new Hdata({type: Hdata.TYPE.STRING, payload: ["OK"]}),
			id: req.id
		});
	}

	_res_find_node(req) {
		const nodes = this._get_nodes_closest_to(req.data.payload[0], Hnode.K_SIZE);

		return new Hmsg({
			rpc: Hmsg.RPC.FIND_NODE,
			from: new Hnode_info(this.node_info),
			type: Hmsg.TYPE.RES,
			data: new Hdata({type: Hdata.TYPE.NODE_LIST, payload: nodes}),
			id: req.id
		});
	}

	_res_find_value(req) {
		let payload = [this.data.get(req.data.payload[0].toString(16))];
		let type = Hdata.TYPE.VAL;
		
		if (!payload[0]) {
			payload = this._get_nodes_closest_to(req.data.payload[0], Hnode.K_SIZE);
			type = Hdata.TYPE.NODE_LIST;
		}

		return new Hmsg({
			rpc: Hmsg.RPC.FIND_VALUE,
			from: new Hnode_info(this.node_info),
			type: Hmsg.TYPE.RES,
			data: new Hdata({type: type, payload: payload}),
			id: req.id
		});
	}

	_on_req(msg) {
		const res = this.RPC_RES_EXEC.get(msg.rpc).bind(this)(msg);
		this.eng._send(res, msg.from)
	}

	_get_nodes_closest_to(key, max = Hnode.K_SIZE) {
		const d = Hnode._get_distance(key, this.node_id);
		const b = Hutil._log2(d);

		const nodes = [];
		const search_order = Hutil._sort_by_distance_from(Array.from(this.kbuckets.keys()), b);

		for (let i = 0; i < search_order.length && nodes.length < max; i += 1) {
			const bucket = this.get_kbucket(search_order[i]);

			// Gotta think here -- we currently have an annoying system where k-buckets are created at a fixed size
			// and populated with undefineds until they reach capacity, because I'm worried about getting bucket.length
			// and iterating through a k-bucket potentially while a message event is pushing new values into the k-bucket
			// but there's gotta be a better way bro
			for (let j = bucket.length() - 1; j >= 0 && nodes.length < max; j -= 1) {	
				const node_info = bucket.at(j);

				if (node_info) {
					nodes.push(new Hnode_info(node_info));
				}
			}
		}	

		return nodes;
	}

	// **** PUBLIC API ****

	async join(node_info) {
		return new Promise(async (resolve, reject) => {
			// TODO: Replace this message with our proper logging function
			console.log(`Joining network as ${this.node_id } via bootstrap node ${node_info.node_id}...`);

			const d = Hnode._get_distance(node_info.node_id, this.node_id);
			const b = Hutil._log2(d);

			this.get_kbucket(b)._push(node_info);

			const result = await this._node_lookup(this.node_id);
			const closest_to_me_sorted = result.payload;

			// Now we refresh every k-bucket further away than the closest neighbor I found
			// the paper says that during the refresh, we must "populate our own k bucket and insert ourselves into other k buckets as necessary"
			// but AFAIK this is just describing the natural outcome of the refresh behavior rather than any additional steps we need to take

			// Since I just did a node lookup on myself, the 0th node in the list returned should be me,
			// since the nodes in the network see me as the closest node to myself
			const distance_to_closest_bro = Hnode._get_distance(closest_to_me_sorted[1].node_id, this.node_id);
			const closest_bro_bucket = Hutil._log2(distance_to_closest_bro);

			for (let i = closest_bro_bucket + 1; i < Hnode.DHT_BIT_WIDTH; i += 1) {
				await this._refresh_kbucket(i);
			}

			console.log(`Success: node ${this.node_id} is online! (At least ${this._get_nodes_closest_to(this.node_id).length} peers found)`);

			// TODO:  Resolve with a Hresult object
			resolve();
		});
	}

	async store(key, val) {
		// TODO: How can we make this return a promise? Currently we have no way of awaiting individual STORE RPC results, and that's probably
		// good because we don't want to be coupled to an Heng implementation...
		const result = await this._node_lookup(key);
		const kclosest = result.payload;

		kclosest.forEach((node_info) => {
			// TODO: Pass a timeout function that just logs the fact that we couldn't store at that node
			this._req_store(key, val, node_info, (res, ctx) => {
				console.log(`Store result: ${res.data.payload}`);
			});
		});
	}

	async find(key) {
		return new Promise(async (resolve, reject) => {
			const result = await this._node_lookup(key, this._req_find_value);
			resolve(result);
		});
	}
}

module.exports.Hnode = Hnode;