/** 
* FKAD_NET_SIM
* FKAD net module for a local network simulator
* When used with FAPP's _debug_sim_start(), this net module
* lets you simulate an FKAD network on one local machine
* 
* 
*/ 

"use strict";

const { Fkad_net } = require("./fkad_net.js");
const { Flog } = require("../../flog/flog.js");
const { Futil } = require("../../futil/futil.js");

class Fkad_net_sim extends Fkad_net {
	static peer_list = new Map();

	constructor() {
		super();
	}

	_add_peer(peer) {
		Fkad_net_sim.peer_list.set(peer.node_id.toString(), peer);
	}

	_get_peers() {
		return Array.from(Fkad_net_sim.peer_list.values());
	}

	_debug_dump_network_state() {
		const unique_data_objects = new Map();
		const nodes = Array.from(Fkad_net_sim.peer_list.values());

		let total_data_objects = 0;

		nodes.forEach((node) => {
			const pairs = node.network_data.entries();

			pairs.forEach((pair) => {
				total_data_objects += 1;

				// We look for stale data collisions - occurances where multiple pieces of unique data were stored on the network
				// using the same key -- by idempotently inserting the hash of each data object's data into a map, then comparing
				// the occurances in the map against the total occurances of data associated with the data's key
				unique_data_objects.set(Futil._sha1(JSON.stringify(pair[1].get_data())), pair[0]);
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

		Flog.log(`********************************************`);
		Flog.log(`[FKAD] FKAD_NET_SIM _DEBUG_DUMP_NETWORK_STATE:`);
		Flog.log(`[FKAD] Total peers: ${Fkad_net_sim.peer_list.size}`);
		Flog.log(`[FKAD] Total data objects: ${total_data_objects} (avg ${(total_data_objects / Fkad_net_sim.peer_list.size).toFixed(1)} data objects per peer)`);
		Flog.log(`[FKAD] Unique data objects: ${unique_data_objects.size}`);
		Flog.log(`[FKAD] Stale data key collisions detected: ${stale}\n`);
	}

	_out(msg, node_info) {
		const peer = Fkad_net_sim.peer_list.get(node_info.node_id.toString());

		if (peer) {
			peer.net._in(msg);
		} 
	}
}

module.exports.Fkad_net_sim = Fkad_net_sim;