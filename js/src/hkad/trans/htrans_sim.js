const { Htrans } = require("../htrans.js");

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

	_out(msg, node_info) {
		const peer = Htrans_sim.peer_list.get(node_info.node_id.toString(16));

		if (peer) {
			peer.trans._in(msg);
		} 
	}
}

module.exports.Htrans_sim = Htrans_sim;