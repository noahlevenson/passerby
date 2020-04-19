"use strict";

const { Hnode } = require("./hnode.js");
const { Heng_alpha } = require("./eng/heng_alpha.js");
const { Htrans_sim } = require("./trans/htrans_sim.js");

// Is the hoodnet.js file necessary in the distribution? Do want to maybe move some global constants here?

// Make a bootstrap node
const beng = new Heng_alpha();
const btrans = new Htrans_sim();
const bootstrap_node = new Hnode({eng: beng, trans: btrans});



// Create a message engine module
const my_preferred_message_eng = new Heng_alpha();

// Create a transport module
const my_local_simulator = new Htrans_sim();

// Create a node for me, the storefront client
const client_node = new Hnode({eng: my_preferred_message_eng, trans: my_local_simulator});

// Add me to the local simulator
my_local_simulator.add_peer(client_node);

// Add the bootstrap node too
my_local_simulator.add_peer(bootstrap_node);



console.log(`ME: ${client_node.node_info.node_id}`)
console.log(`BOOSTRAP NODE: ${bootstrap_node.node_info.node_id}`)




// Now let's add some other nodes to the simulated network
for (let i = 0; i < 500
	; i += 1) {
	const message_eng = new Heng_alpha();
	const local_simulator = new Htrans_sim();
	const node = new Hnode({eng: message_eng, trans: local_simulator});

	my_local_simulator.add_peer(node);

	node.join(bootstrap_node.node_info);

	// console.log(`A peer node has joined: ${node.node_info.node_id}`)
}


(async function doshit() {
	await client_node.join(bootstrap_node.node_info);

	client_node.store(BigInt(500), "Hey it's some arbitrary data bro");
})()


// for (let i = BigInt(0); i < (2n ** BigInt(Hnode.DHT_BIT_WIDTH)); i += BigInt(1)) {
// 	client_node.node_lookup(i).then((list) => {
// 		if (list && 
// 			list[0].node_id === i) {
// 			console.log(`A node exists at ${i}`)
// 		}
// 	});
// }



// // console.log(bootstrap_node._get_nodes_closest_to(BigInt(0), 100));

// console.log(client_node._get_nodes_closest_to(BigInt(0), 20).length);






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

