const { Htrans } = require("../htrans.js");
const { Hutil } = require("../../hutil/hutil.js");

// Htrans_sim is a hoodnet transport module that implements a local network simulator
class Htrans_sim extends Htrans {
	static peer_list = new Map();

	constructor() {
		super();
	}

	_add_peer(peer) {
		Htrans_sim.peer_list.set(peer.node_id.toString(16), peer);
	}

	_get_peers() {
		return Array.from(Htrans_sim.peer_list.values());
	}

	_debug_dump_network_state() {
		const unique_data_objects = new Map();
		const nodes = Array.from(Htrans_sim.peer_list.values());

		let total_data_objects = 0;

		nodes.forEach((node) => {
			const pairs = Array.from(node.data.entries());

			pairs.forEach((pair) => {
				total_data_objects += 1;
				unique_data_objects.set(Hutil._sha1(JSON.stringify(pair[1])), pair[0]);
			});
		});

		const keys_of_unique_data_objects = Array.from(unique_data_objects.values());
		const unique_keys_of_unique_data_objects = [];

		keys_of_unique_data_objects.forEach((key) => {
			if (unique_keys_of_unique_data_objects.indexOf(key) === -1) {
				unique_keys_of_unique_data_objects.push(key);
			}
		});

		let stale = 0;

		unique_keys_of_unique_data_objects.forEach((key) => {
			if (keys_of_unique_data_objects.indexOf(key) !== keys_of_unique_data_objects.lastIndexOf(key)) {
				stale += 1;
			}
		});

		console.log(`[HKAD] HTRANS_SIM _DEBUG_DUMP_NETWORK_STATE:`);
		console.log(`[HKAD] Total peers: ${Htrans_sim.peer_list.size}`);
		console.log(`[HKAD] Total data objects: ${total_data_objects} (avg ${(total_data_objects / Htrans_sim.peer_list.size).toFixed(1)} data objects per peer)`);
		console.log(`[HKAD] Unique data objects: ${unique_data_objects.size}`);
		console.log(`[HKAD] Stale data key collisions detected: ${stale}\n`);
	}

	_out(msg, node_info) {
		const peer = Htrans_sim.peer_list.get(node_info.node_id.toString(16));

		if (peer) {
			peer.trans._in(msg);
		} 
	}
}

module.exports.Htrans_sim = Htrans_sim;