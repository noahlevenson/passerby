const { Hnode_info } = require("./hnode_info.js");
const { Hkbucket } = require("./hkbucket.js");
const { Hmsg } = require("./hmsg.js");

// A hoodnet DHT node
// Nodes are the nucleus, wiring together a message engine module and transport module
class Hnode {
	// TODO: It'd be nice if these were actually consts, but it's not currently supported
	static DHT_BIT_WIDTH = 160;
	static ID_LEN = this.DHT_BIT_WIDTH / 8;
	static K_SIZE = 20;
	static ALPHA = 3;

	static RPC_RESPONSE_ENCODING = new Map([
		[Hmsg.RPC.PING, function(msg) { // You can use arrow functions here if you remember the syntax to bind arguments
			return new Hmsg({
				rpc: Hmsg.RPC.PING,
				from: new Hnode_info(this.node_info),
				res: true,
				data: "PONG",
				id: msg.id
			});
		},
		Hmsg.RPC.STORE, function(msg) {
			// Coming soon
		}]
	]);

	constructor({transport = null, message_eng = null} = {}) {
		// TODO: validate that the transport and message eng module are instances of the correct base classes and implement the functionality we rely on
		this.transport = transport;
		this.message_eng = message_eng;
		this.node_id = Hmsg.generate_random_key(this.DHT_BIT_WIDTH);  // This is just a temp hack!! Node IDs must be generated properly bro!
		this.node_info = new Hnode_info({ip_addr: "127.0.0.1", udp_port: 31337, node_id: BigInt(this.node_id)});

		this.k_buckets = [];
		
		for (let i = 0; i < Hnode.DHT_BIT_WIDTH; i += 1) {
			this.k_buckets.push(new Hkbucket({size: Hnode.K_SIZE}));
		}

		// Both of the below practices need to be examined and compared to each other for consistency of philosophy - how much does each module need to be aware of other modules' interfaces?
		this.message_eng.node = this; // We reach out to the message engine to give it a reference to ourself, currently just so that the message engine can reach back and get our transport reference and call its out() method
		this.transport.network.on("message", this.message_eng.on_message.bind(this.message_eng)) // Here we have the node wire up the transport to the message engine - kinda cool, but maybe too complex and not loosely coupled enough?
	}

	static get_distance(key1, key2) {
		return key1 ^ key2;
	}

	ping(node_info, cb) {
		const msg = new Hmsg({
			rpc: Hmsg.RPC.PING,
			from: new Hnode_info(this.node_info)
		});

		this.message_eng.send(msg, node_info, cb);
	}

	store(node_info, cb) {

	}

	find_node(node_info, cb) {

	}

	find_value(node_info, cb) {

	}

	_on_message(msg) {
		this.message_eng.send(Hnode.RPC_RESPONSE_ENCODING.get(msg.rpc).bind(this)(msg), msg.from)
	}
}

module.exports.Hnode = Hnode;