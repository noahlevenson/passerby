const { Hkad_net } = require("./hkad_net.js");
const { Hutil } = require("../../hutil/hutil.js");

// Hkad_net_sim is an HKAD network module that implements a local network simulator
class Hkad_net_sim extends Hkad_net {
	static peer_list = new Map();

	constructor() {
		super();
	}

	_add_peer(peer) {
		Hkad_net_sim.peer_list.set(peer.node_id.toString(), peer);
	}

	_get_peers() {
		return Array.from(Hkad_net_sim.peer_list.values());
	}

	_debug_dump_network_state() {
		const unique_data_objects = new Map();
		const nodes = Array.from(Hkad_net_sim.peer_list.values());

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

		console.log(`********************************************`);
		console.log(`[HKAD] HKAD_NET_SIM _DEBUG_DUMP_NETWORK_STATE:`);
		console.log(`[HKAD] Total peers: ${Hkad_net_sim.peer_list.size}`);
		console.log(`[HKAD] Total data objects: ${total_data_objects} (avg ${(total_data_objects / Hkad_net_sim.peer_list.size).toFixed(1)} data objects per peer)`);
		console.log(`[HKAD] Unique data objects: ${unique_data_objects.size}`);
		console.log(`[HKAD] Stale data key collisions detected: ${stale}\n`);
	}

	_out(msg, node_info) {
		const peer = Hkad_net_sim.peer_list.get(node_info.node_id.toString());

		if (peer) {
			peer.net._in(msg);
		} 
	}
}

module.exports.Hkad_net_sim = Hkad_net_sim;
