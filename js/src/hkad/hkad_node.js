/** 
* HKAD_NODE
* An HKAD_NODE is the nucleus of HKAD
* It implements the Kademlia protocol and wires together an HKAD_ENG
* with an HKAD_NET to provide a message engine and network I/O 
*
*
*/ 

"use strict";


const { Happ_env } = require("../happ/happ_env.js");
const { Hlog } = require("../hlog/hlog.js");
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
const crypto = Happ_env.ENV === Happ_env.ENV_TYPE.NODE ? require("crypto") : null;
const { Hbigint } = Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE ? require("../htypes/hbigint/hbigint_rn.js") : require("../htypes/hbigint/hbigint_node.js");

class Hkad_node {
	static DHT_BIT_WIDTH = 160;
	static ID_LEN = this.DHT_BIT_WIDTH / Happ_env.SYS_BYTE_WIDTH;
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
	replicate_interval_handle;
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

		this.node_id = id || Hkad_node.get_random_key(); // You sure you wanna be able to do this bro?

		// SO! Your node info actually should be set first thing during bootstrapping -- the boostrap process should go like this:
		// first send a STUN request, set our node_info with our external IP and port, and then initiate the Kademlia bootstrap process
		// but for our first one-machine network tests, we'll just manually supply a port...
		this.node_info = new Hkad_node_info({addr: addr, port: port, node_id: new Hbigint(this.node_id)});

		// Here's the new bro
		this.routing_table = new Hbintree(new Hbintree_node({
			data: new Hkad_kbucket({max_size: Hkad_node.K_SIZE, prefix: ""})
		}));

		this.network_data = new Hkad_ds();
		this.rp_data = new Hkad_ds();

		// Both of the below practices need to be examined and compared to each other for consistency of philosophy - how much does each module need to be aware of other modules' interfaces?
		this.eng.node = this; // We reach out to the message engine to give it a reference to ourself, currently just so that the message engine can reach back and get our net module reference and call its out() method
		this.net.node = this; // Ditto for the net module
		this.net.network.on("message", this.eng._on_message.bind(this.eng)) // TODO: move this to boostrap - don't want to handle messages until we've decided to join the network
	}

	// Get XOR "distance" between two Hbigint values
	static _get_distance(key1, key2) {
		return key1.xor(key2);
	}

	static get_random_key(len = Hkad_node.ID_LEN) {
		return new Hbigint(crypto.randomBytes(len).toString("hex"));
	}

	// Prints DFS
	_debug_print_routing_table() {
		Hlog.log(`*******************************************`, true);
		Hlog.log(`[HKAD] HKAD_NODE _DEBUG_PRINT_ROUTING_TABLE:`);

		this.routing_table.dfs((node, data) => {
			const bucket = node.get_data();
			
			if (bucket !== null) {
				Hlog.log(`[HKAD] prefix "${bucket.get_prefix()}" - ${bucket.length()} contacts`);
			}
		});
	}

	// Here's the idea: The point of refreshing a bucket is to force some fresh traffic of contacts that are hopefully within the bucket's range, such that our _update_routing_table function
	// evicts some contacts and inserts some new ones. To that end, we select a "random ID in the bucket's range" and do a node lookup on it -- asking our peers to tell us what are the K
	// nodes they know about that are the closest to that ID. To get a "random ID in the bucket's range," we can just select the ID of a random node in the bucket - though it might be more
	// rigorous to generate a random ID in the bucket's range, as our peers might know about nodes that are closer to some undefined value than they are to the nodes we already know about.
	async _refresh_kbucket(kbucket) {
		const random_id = kbucket.get(Math.floor(Math.random() * kbucket.length())).node_id;
		Hlog.log(`[HKAD] Refreshing k-bucket for range including ID ${random_id.toString()}`);
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

	// This function sucks - it does a lot of different kinds of shit - it decides if a contact
	// needs to be inserted, splits buckets in the routing table tree, replicates data to new contacts...
	// we need to straighten out the design of this: how and why does Hkad_eng_alpha initiate the process
	// of inserting new contacts into the routing table, and appropriately replicating data to them?
	_routing_table_insert(inbound_node_info) {
		let leaf_node = this.find_kbucket_for_id(inbound_node_info.node_id);
		let bucket = leaf_node.get_data();
		const node_info = bucket.exists(inbound_node_info);

		if (node_info !== null) {
			// We've already seen this node in this bucket, so just move it to the tail
			bucket.delete(node_info);
			bucket.enqueue(inbound_node_info);
		} else if (node_info === null && !bucket.is_full()) {
			// We've never seen this node and the appropriate bucket isn't full, so just insert it
			bucket.enqueue(inbound_node_info);

			// Replicate any of our data that is appropriate to this new node
			this.network_data.entries().forEach((pair) => {
				const key = new Hbigint(pair[0]);
				const cnodes = this._new_get_nodes_closest_to(key);

				// If the new node is one of the K closest nodes to this key AND I'm closer to the key than any of my neighbors (or 
				// the new node is now closer to the key than I am) -- then replicate this (key, value) pair to the new node
				if (cnodes.includes(inbound_node_info) && 
						(Hkad_node._get_distance(this.node_id, key).less_equal(Hkad_node._get_distance(cnodes[0].node_id, key) || 
							cnodes[0] === inbound_node_info))) {
					
					Hlog.log(`[HKAD] Replicating ${key.toString()} to new node ${inbound_node_info.node_id.toString()}`);
					this._req_store(key, pair[1].get_data(), inbound_node_info);
				}
			});
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

				// Attempt reinsertion via recursion
				this._routing_table_insert(inbound_node_info);
			} else {
				// This is the confusing/contradictory case - either we're supposed to just discard the new contact, or we're supposed to ping the oldest contact 
				// in the bucket (below) to decide if we evict/replace or discard 
				// NO, YOU KNOW WHAT IT IS? 
				// per the optimizations in section 4.1, you're actually not supposed to do the ping for every new contact --
				// instead, you're supposed to add the new contact to the "replacement cache" and then do a lazy replacement the next time you need to access the bucket

				// Also a nagging question:  If a "new contact" is discarded (or moved to the replacement cache), we're definitely not supposed to replicate our data
				// to them... right?  Is it mathematically possible for that to happen?
			}
		}
	}

	async _node_lookup(key, rpc = this._req_find_node) {
		// BST comparator function for inserting a node_info object: compare both its XOR distance from the key and the lexicographical distance 
		// of its concatenated and stringified address/port... i.e., we want to keep our node_info BST sorted by XOR distance from the key,
		// but we also want to allow for non-unique items which share the same key but have different addr/port (because of churn or whatever)
		function _by_distance_and_lex(node, oldnode) {
			if (Hkad_node._get_distance(key, node.get_data().node_id).less(Hkad_node._get_distance(key, oldnode.get_data().node_id))) {
				return -1;
			} else if (Hkad_node._get_distance(key, node.get_data().node_id).greater(Hkad_node._get_distance(key, oldnode.get_data().node_id))) {
				return 1;
			}

			// Here's the complex case: the new node_info has the same key as some existing data, so we gotta do 
			// lexical comparison on the network info
			const node_net_info = `${node.get_data().addr}${node.get_data().port}`;
			const oldnode_net_info = `${oldnode.get_data().addr}${oldnode.get_data().port}`;
			return node_net_info.localeCompare(oldnode_net_info);
		}

		// BST comparator function for searching: to search by node ID in a BST ordered by distance from the key in the closure
		function _by_strict_equality(k, node) {
			const node_info = node.get_data();

			if (Hkad_node._get_distance(key, k.node_id).less(Hkad_node._get_distance(key, node_info.node_id))) {
				return -1;
			} else if (Hkad_node._get_distance(key, k.node_id).greater(Hkad_node._get_distance(key, node_info.node_id))) {
				return 1;
			}

			// Complex case: the thing we're searching for has the same key as some existing data, so we gotta do
			// lexical comparison on the network info
			const node_net_info = `${k.addr}${k.port}`;
			const oldnode_net_info = `${node_info.addr}${node_info.port}`;
			return node_net_info.localeCompare(oldnode_net_info);
		}

		// Send the RPCs and maintain the node lists - if a value is returned, it returns that value, otherwise returns undefined
		async function _do_node_lookup(active, inactive, rsz = Hkad_node.ALPHA) {
			const contacts = [];
			let node = inactive.bst_min();

			while (node !== null && contacts.length < rsz) {
				contacts.push(node);
				node = inactive.bst_successor(node);
			}

			const res = [];
			
			contacts.forEach((node) => {
				res.push(new Promise((resolve, reject) => {
					rpc.bind(this)(key, node.get_data(), (res, ctx) => {
						if (res.data.type === Hkad_data.TYPE.VAL) {
							resolve([res.data.payload, active.bst_min()]);
						}	

						active.bst_insert(new Hbintree_node({data: res.from}), _by_distance_and_lex.bind(this));
						inactive.bst_delete(node);

						res.data.payload.forEach((node_info) => {
							if (active.bst_search(_by_strict_equality.bind(this), node_info) === null) {
								inactive.bst_insert(new Hbintree_node({data: node_info}), _by_distance_and_lex.bind(this));
							}
						});

						resolve(null);
					}, () => {
						inactive.bst_delete(node);
						resolve(null);
					});
				}));
			});

			return await Promise.all(res).then((values) => {
				for (let i = 0; i < values.length; i += 1) {
					if (values[i] !== null) {
						return values[i];
					}
				}
			});
		}

		// *** INIT ***
		const active = new Hbintree();
		const inactive = new Hbintree();

		this._new_get_nodes_closest_to(key, Hkad_node.ALPHA).forEach((node_info) => {
			inactive.bst_insert(new Hbintree_node({data: node_info}), _by_distance_and_lex.bind(this));
		});

		let lc;
		let val;
	
		// *** MAIN LOOP ***
		while (active.size() < Hkad_node.K_SIZE && !val) {
			const c = active.bst_min();
			const isz = inactive.size();

			if (c === lc && isz === 0) {
				break;
			} else if (c === lc && isz > 0) {
				val = await _do_node_lookup.bind(this, active, inactive, isz)();
			} else {
				lc = c;
				val = await _do_node_lookup.bind(this, active, inactive)();
			}
		}

		if (val) {
			if (val[1] !== null) {
				this._req_store(key, val[0][0], val[1].get_data(), (res, ctx) => {
					Hlog.log(`[HKAD] Stored ${key} to node ${val[1].get_data().node_id}`);
				});
			}

			return new Hkad_data({type: Hkad_data.TYPE.VAL, payload: val[0]});
		}

		const sorted = active.inorder((node, data) => {
			data.push(node.get_data());
			return data;	
		});

		return new Hkad_data({type: Hkad_data.TYPE.NODE_LIST, payload: sorted});
	}

	_req_ping(node_info, success, timeout) {
		const msg = new Hkad_msg({
			rpc: Hkad_msg.RPC.PING,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.REQ,
			id: Hkad_node.get_random_key()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_store(key, val, node_info, success, timeout) {
		const msg = new Hkad_msg({
			rpc: Hkad_msg.RPC.STORE,
			from: new Hkad_node_info(this.node_info),

			type: Hkad_msg.TYPE.REQ,
			data: new Hkad_data({type: Hkad_data.TYPE.PAIR, payload: [key, val]}),
			id: Hkad_node.get_random_key()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_find_node(key, node_info, success, timeout) {
		const msg = new Hkad_msg({
			rpc: Hkad_msg.RPC.FIND_NODE,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.REQ,
			data: new Hkad_data({type: Hkad_data.TYPE.KEY, payload: [key]}),
			id: Hkad_node.get_random_key()
		});

		this.eng._send(msg, node_info, success, timeout);
	}

	_req_find_value(key, node_info, success, timeout) {
		const msg = new Hkad_msg({
			rpc: Hkad_msg.RPC.FIND_VALUE,
			from: new Hkad_node_info(this.node_info),
			type: Hkad_msg.TYPE.REQ,
			data: new Hkad_data({type: Hkad_data.TYPE.KEY, payload: [key]}),
			id: Hkad_node.get_random_key()
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
		// # of nodes between us and the key is approximated from the tree depth of their respective buckets
		const d1 = this.find_kbucket_for_id(this.node_id).get_data().get_prefix().length;
		const d2 = this.find_kbucket_for_id(req.data.payload[0]).get_data().get_prefix().length;
		const ttl = Hkad_node.T_DATA_TTL * Math.pow(2, -(Math.max(d1, d2) - Math.min(d1, d2))); 

		this.network_data.put({
			key: req.data.payload[0].toString(),
			val: req.data.payload[1],
			ttl: ttl
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

		let ds_rec = this.network_data.get(req.data.payload[0].toString());

		// Lazy deletion - the requested data exists but has expired, so delete it from our data store
		if (ds_rec && Date.now() > (ds_rec.get_created() + ds_rec.get_ttl())) {
			this.network_data.delete(req.data.payload[0].toString());
			ds_rec = undefined;
		}

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

	_init_intervals() {
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

		Hlog.log(`[HKAD] K-bucket refresh interval: ${(Hkad_node.T_KBUCKET_REFRESH / 60 / 60 / 1000).toFixed(1)} hours`);

		// Idempotently start the data republish interval
		if (this.republish_interval_handle === null) {
			this.republish_interval_handle = setInterval(() => {
				this.rp_data.entries().forEach((pair) => {
					this.put(new Hbigint(pair[0]), pair[1].get_data(), true);
				});
			}, Hkad_node.T_REPUBLISH);
		}

		Hlog.log(`[HKAD] Data republish interval: ${(Hkad_node.T_REPUBLISH / 60 / 60 / 1000).toFixed(1)} hours`);

		// Idempotently start the data replication interval
		if (this.replicate_interval_handle === null) {
			this.replicate_interval_handle = setInterval(() => {
				this.network_data.entries().forEach((pair) => {
					const t1 = Date.now();

					// If no one has issued a STORE on this data over the last hour and the data isn't expired, let's do a PUT on it
					if (t1 > (pair[1].get_created() + Hkad_node.T_REPLICATE) && t1 < (pair[1].get_created() + pair[1].get_ttl())) {
						this.put(new Hbigint(pair[0]), pair[1].get_data());
					}
				});
			}, Hkad_node.T_REPLICATE);
		}

		Hlog.log(`[HKAD] Replication interval: ${(Hkad_node.T_REPLICATE / 60 / 60 / 1000).toFixed(1)} hours`);
	}

	// **** PUBLIC API ****

	// Supply an addr + port (real world) or just a node_id (local simulation)
	async bootstrap({addr = null, port = null, node_id = null} = {}) {
		let node_info;

		if (addr && port) {
			node_info = await new Promise((resolve, reject) => {
				this._req_ping({addr: addr, port: port, node_id: new Hbigint(-1)}, (res, ctx) => { // node_id of -1 because we must always supply a value
					resolve(res.from);
				}, () => {
					resolve(null);
				});
			});
		} else if (node_id instanceof Hbigint) {
			node_info = new Hkad_node_info({addr: addr, port: port, node_id: node_id});
		} else {
			throw new TypeError("Argument error");
		}

		Hlog.log(`[HKAD] Joining network as ${this.node_id.toString()} via bootstrap node ${addr}:${port}...`);

		if (node_info === null) {
			Hlog.log(`[HKAD] No PONG from bootstrap node ${addr}:${port}`);
			return false;
		}	

		const bucket = this.find_kbucket_for_id(node_info.node_id).get_data();
		bucket.enqueue(node_info);

		// Do a node lookup for my own ID and refresh every k-bucket further away than the closest neighbor I found
		const res = await this._node_lookup(this.node_id);
		const closest_nodes = res.payload;

		let i = 0;

		while (i < closest_nodes.length - 1 && closest_nodes[i].node_id.equals(this.node_id)) {
			i += 1;
		}

		i += 1

		const buckets = new Set();

		while (i < closest_nodes.length) {
			buckets.add(this.find_kbucket_for_id(closest_nodes[i].node_id).get_data());
			i += 1
		}	

		buckets.forEach((bucket) => {
			this._refresh_kbucket(bucket);
		});

		Hlog.log(`[HKAD] Success: node ${this.node_id.toString()} is online! (At least ${this._new_get_nodes_closest_to(this.node_id).length} peers found)`);
		this._init_intervals();
		return true;
	}

	// Publish data to the peer network
	// If rp = true, we'll republish data every T_REPUBLISH ms 
	// Data that is not republished will expire after T_DATA_TTL ms
	async put(key, val, rp = false) {
		if (rp) {
			this.rp_data.put({
				key: key,
				val: val,
				ttl: Number.POSITIVE_INFINITY
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
		// Hlog.log(`[HKAD] PUT key ${key.toString()} (${successful} / ${resolutions.length} OK)`)
		return successful > 0 ? true : false;
	}

	async get(key) {
		const result = await this._node_lookup(key, this._req_find_value);
		return result;
	}

	// Delete (or "unpublish") data from the peer network
	// You can only delete data that you are the original publisher of
	// Deletion is synonymous with "cease republication of" -- so 
	// deleted data will start to disappear from the network after T_DATA_TTL ms
	delete(key) {
		return this.rp_data.delete(key);
	}
}

module.exports.Hkad_node = Hkad_node;