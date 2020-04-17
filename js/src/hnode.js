const { Hnode_info } = require("./hnode_info.js");
const { Hkbucket } = require("./hkbucket.js");
const { Hmsg } = require("./hmsg.js");
const { Hutil } = require("./hutil.js");
const { Hmin_priority_queue } = require("./hcontainer.js"); 

// A hoodnet DHT node
// Nodes are the nucleus, wiring together a message engine module and transport module
class Hnode {
	// TODO: We can make these const-like by making them private and implementing getters
	static DHT_BIT_WIDTH = 160;
	static ID_LEN = this.DHT_BIT_WIDTH / 8;
	static K_SIZE = 20;
	static ALPHA = 3;

	// Dislike that this isn't static, but need to access the instanced handler functions?
	RPC_RES_EXEC = new Map([
		[Hmsg.RPC.PING, this._res_ping],
		[Hmsg.RPC.STORE, this._res_store],
		[Hmsg.RPC.FIND_NODE, this._res_find_node],
		[Hmsg.RPC.FIND_VALUE, this._res_find_value]
	]);

	constructor({transport = null, eng = null} = {}) {
		// TODO: validate that the transport and message eng module are instances of the correct base classes and implement the functionality we rely on
		this.transport = transport;
		this.eng = eng;
		this.node_id = Hmsg.generate_random_key(this.DHT_BIT_WIDTH);  // This is just a temp hack!! Node IDs must be generated properly bro!
		this.node_info = new Hnode_info({ip_addr: "127.0.0.1", udp_port: 31337, node_id: BigInt(this.node_id)});

		this.kbuckets = new Map();
		
		for (let i = 0; i < Hnode.DHT_BIT_WIDTH; i += 1) {
			this.kbuckets.set(i, new Hkbucket({size: Hnode.K_SIZE}));
		}

		// This is our local data store -- I guess we're rehashing keys but whatever
		this.data = new Map();

		// Both of the below practices need to be examined and compared to each other for consistency of philosophy - how much does each module need to be aware of other modules' interfaces?
		this.eng.node = this; // We reach out to the message engine to give it a reference to ourself, currently just so that the message engine can reach back and get our transport reference and call its out() method
		this.transport.network.on("message", this.eng.on_message.bind(this.eng)) // Here we have the node wire up the transport to the message engine - kinda cool, but maybe too complex and not loosely coupled enough?
	}

	static get_distance(key1, key2) {
		return key1 ^ key2;
	}

	get_kbucket(i) {
		return this.kbuckets.get(i);
	}

	bootstrap(node_info) {
		const d = Hnode.get_distance(node_info.node_id, this.node_id);
		const b = Hutil._log2(d);

		this.get_kbucket(b).push(node_info);

		this.node_lookup(this.node_id);

		
		// TODO: perform the "refresh" step
	}

	// BRO, we need to make sure keys are strings when they need to be strings and BigInt objects when they need to be BigInt objects
	// Overall this is a really inefficient algorithm and we can make it better
	node_lookup(key) {
		function _do_node_lookup(res, ctx) {

			// BRO -- do we even use the active property?  Shouldn't


			// We got a response for this node, so set it to active + queried
			// This is linear search, really bad -- do we want to mirror the node_list as a map for O(1) search?
			
			//const node_info = node_list.search(Hnode.get_distance(key, res.from.node_id)).get_obj();

			const distance = Hnode.get_distance(key, res.from.node_id);
			const node_info = node_map.get(distance.toString(16));
			
			node_info.queried = true; // Why do we set this to true twice?
			node_info.active = true;
			node_info.distance = distance;

			// Add the response nodes to the node list, only if they're unique

			// console.log(res.data);

			res.data.forEach((node_info) => {
				const distance = Hnode.get_distance(key, node_info.node_id);

				if (!node_map.get(distance.toString(16))) {
					node_info.queried = false;
					node_info.active = false;
					node_info.distance = distance;
					// node_list.insert(node_info, Hnode.get_distance(key, node_info.node_id));
					node_map.set(distance.toString(16), node_info);
				}
			});

			// pick alpha nodes from the node list that we have not yet queried and send find_node requests to them
			// This is super dumb - we traverse the priority queue by popping the min object and re-inserting it
			// Need to rethink the way we're doing all of this
			const new_node_infos = [];

			// for (let i = 0; i < node_list.heap_size() && new_node_infos.length < Hnode.ALPHA; i += 1) {
			// 	const q_node = node_list.extract_min();
				
			// 	if (!q_node.get_obj().queried) {
			// 		new_node_infos.push(q_node.get_obj());
			// 	}

			// 	node_list.insert(q_node.get_obj(), q_node.get_key());
			// }

			// Please don't do this, it's slow and bad
			// A priority queue is bad because the insert() function results in a race condition between each branch of the recursion
			// it's also not good for traversing values to find those we haven't queried
			// the hash map is nice because you get constant time lookups
			// but this sort we have to perform on every recursion is murder
			const sorted = Array.from(node_map.values()).sort((a, b) => {
				return a.distance > b.distance ? 1 : -1;
			});

			// console.log(sorted);

			for (let i = 0; i < sorted.length && new_node_infos.length < Hnode.ALPHA; i += 1) {
				if (!sorted[i].queried) {
					new_node_infos.push(sorted[i]);
				}
			}

			// console.log(new_node_infos);

			new_node_infos.forEach((node_info) => {
				node_info.queried = true;
				node_info.active = false;
				// node_info.distance = Hnode.get_distance(key, node_info.node_id);
				ctx.find_node(key, node_info, _do_node_lookup);
			});
		}

		const node_infos = this._get_nodes_closest_to(key, Hnode.ALPHA);
		const node_map = new Map();
		
		node_infos.forEach((node_info) => {
			// TODO: This is really hacky - we just add properties to the Hnode_info objects to keep track of 
			// who we've queried and who is active - can we do this better?
			node_info.queried = true;
			node_info.active = false;
			node_info.distance = Hnode.get_distance(key, node_info.node_id); // Especially distance - shouldn't we just make this part of node info objs?

			node_map.set(node_info.distance.toString(16), node_info);

			// node_list.insert(node_info, Hnode.get_distance(key, node_info.node_id));
			this.find_node(key, node_info, _do_node_lookup);
		});
	}

	// How our RPC req/res system works:
	// If you want to make an RPC req, you call the appropriate RPC function and specify what you want to want to do with the response in a callback -- 
	// your Heng module is responsible for figuring out how to keep track of the process (some Heng modules might keep messages as state in a queue and implement GC for timeouts, some might just use promises...)
	// Similarly, your Heng module is responsible for determining what is an incoming RPC req for us to answer, and it forwards it to our _on_req() function
	ping(node_info, cb) {
		const msg = new Hmsg({
			rpc: Hmsg.RPC.PING,
			from: new Hnode_info(this.node_info)
		});

		this.eng.send(msg, node_info, cb);
	}

	store(key, val, node_info, cb) {
		const msg = new Hmsg({
			rpc: Hmsg.RPC.STORE,
			from: new Hnode_info(this.node_info),
			data: [key, val]
		});

		this.eng.send(msg, node_info, cb);
	}

	find_node(key, node_info, cb) {
		const msg = new Hmsg({
			rpc: Hmsg.RPC.FIND_NODE,
			from: new Hnode_info(this.node_info),
			data: key
		});

		this.eng.send(msg, node_info, cb);
	}

	find_value(key, node_info, cb) {
		const msg = new Hmsg({
			rpc: Hmsg.RPC.FIND_VALUE,
			from: new Hnode_info(this.node_info),
			data: key
		});

		this.eng.send(msg, node_info, cb);
	}

	_res_ping(req) {
		return new Hmsg({
			rpc: Hmsg.RPC.PING,
			from: new Hnode_info(this.node_info),
			res: true,
			data: "PONG",
			id: req.id
		});
	}

	_res_store(req) {
		this.data.set(req.data[0].toString(16), req.data[1]);

		return new Hmsg({
			rpc: Hmsg.RPC.STORE,
			from: new Hnode_info(this.node_info),
			res: true,
			data: "OK",
			id: req.id
		});
	}

	_res_find_node(req) {
		const nodes = this._get_nodes_closest_to(req.data, Hnode.K_SIZE);

		return new Hmsg({
			rpc: Hmsg.RPC.FIND_NODE,
			from: new Hnode_info(this.node_info),
			res: true,
			data: nodes,
			id: req.id
		});
	}

	_res_find_value(req) {
		let data = this.data.get(req.data.toString(16));
		
		if (!data) {
			data = this._get_nodes_closest_to(req.data, Hnode.K_SIZE);
		}

		return new Hmsg({
			rpc: Hmsg.RPC.FIND_VALUE,
			from: new Hnode_info(this.node_info),
			res: true,
			data: data,
			id: req.id
		});
	}

	_get_nodes_closest_to(key, max) {
		const d = Hnode.get_distance(key, this.node_id);
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

	_on_req(msg) {
		const res = this.RPC_RES_EXEC.get(msg.rpc).bind(this)(msg);
		this.eng.send(res, msg.from)
	}
}

module.exports.Hnode = Hnode;