"use strict";

const crypto = require("crypto"); // DELETE ME!!!!!

const { Hnode } = require("./hnode.js");
const { Heng_alpha } = require("./eng/heng_alpha.js");
const { Htrans_sim } = require("./trans/htrans_sim.js");


const { Hmin_priority_queue } = require("./hcontainer.js")

// Is this source file necessary in the distribution? Do want to maybe move some global constants here?

// Create a message engine module
const my_preferred_message_eng = new Heng_alpha();

// Create a transport module
const my_local_simulator = new Htrans_sim();

// Create a node for me
const me = new Hnode({eng: my_preferred_message_eng, transport: my_local_simulator});

// Add me to the local simulator
my_local_simulator.add_peer(me);

// Now let's add some other nodes to the simulated network
for (let i = 0; i < 10; i += 1) {
	const message_eng = new Heng_alpha();
	const local_simulator = new Htrans_sim();
	const node = new Hnode({eng: message_eng, transport: local_simulator});

	my_local_simulator.add_peer(node);
}

// Let's ping everyone in the peer list
// my_local_simulator.get_peers().forEach((peer) => {
// 	// me.ping(peer.node_info, (res, ctx) => {
// 	// 	console.log(`Ping acknowledge, res msg: ${res.data}`)
// 	// });

// 	// me.find_node(BigInt(`0x${crypto.randomBytes(20).toString("hex")}`), peer.node_info, (res, ctx) => {
// 	// 	// console.log(`Got a FIND NODE res: ${res.data}`)
// 	// 	console.log(res);
// 	// });

// 	const key = BigInt(`0x${crypto.randomBytes(20).toString("hex")}`);

// 	me.store(key, "Hey it's some arbitrary data bro", peer.node_info, (res, ctx) => {
// 		console.log(ctx.data);
		
// 		me.find_value(key, peer.node_info, (res, ctx) => {
// 			console.log(`Got the data! ${res.data}`)
// 		});
// 	});
// });

