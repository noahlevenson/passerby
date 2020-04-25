// Happ -- this is the entry point to a new hoodnet instance -- it's how you bootstrap a complete local instance of the hoodnet protocol

// SO, for a restaurant to implement hoodnet, happ will eventually:

// 1.  accept a street address and geocode it to lat/long coords

// 2.  create an hgeo_coord lat/long object and get its linearization

// 3.  bootstrap a new kademlia node on the network using the hash of the linearization as the node_id (and ensuring no collisions, etc)

// 4.  insert a new PHT key using the raw linearization as the key 


// AND, for a client to implement hoodnet, happ will eventually:

// 1. bootstrap a new kademlia node using a random key

// 2. provide services to create hgeo_coord lat/long objects and get their linearizations

// 3. provide services to range query the PHT using linearizations as keys


"use strict";

const { Hnode } = require("../hkad/hnode.js");
const { Heng_alpha } = require("../hkad/eng/heng_alpha.js");
const { Htrans_sim } = require("../hkad/trans/htrans_sim.js");
const { Hpht } = require("../hpht/hpht.js");

const { Hutil } = require("../hutil/hutil.js"); // DELETE ME!!!

// Is the hoodnet.js file necessary in the distribution? Do want to maybe move some global constants here?

// Make a bootstrap node
const beng = new Heng_alpha();
const btrans = new Htrans_sim();
const bootstrap_node = new Hnode({eng: beng, trans: btrans});

// Create a simulator transport module
const my_local_simulator = new Htrans_sim();

// Add the bootstrap node to the local simulator
my_local_simulator._add_peer(bootstrap_node);


// Now let's add some other nodes to the simulated network
for (let i = 0; i < 100; i += 1) {
	(async function() {
		const message_eng = new Heng_alpha();
		const local_simulator = new Htrans_sim();
		const node = new Hnode({eng: message_eng, trans: local_simulator});
		my_local_simulator._add_peer(node);
		await node.bootstrap(bootstrap_node.node_info);

		// console.log(`A peer node has joined: ${node.node_info.node_id}`)
	})();	
}

// now that we have a network of peers established, let's do our tests
doit();

async function doit() {

	// Create a message engine module
	const my_preferred_message_eng = new Heng_alpha();

	// Create a node for me, Pizzeria La Rosa
	const larosa = new Hnode({eng: my_preferred_message_eng, trans: my_local_simulator});

	// Add me to the local simulator
	my_local_simulator._add_peer(larosa);

	// Bootstrap me and join the network
	await larosa.bootstrap(bootstrap_node.node_info);

	// Create a PHT interface for La Rosa
	const larosa_pht = new Hpht({
		index_attr: "___h00dn3t.geoha$h!!",
		dht_lookup: larosa._node_lookup, 
		dht_lookup_args: [larosa._req_find_value], 
		dht_node: larosa
	});

	await larosa_pht.init();

	await larosa_pht.init();

	const res = await larosa_pht.lookup_lin(Hnode.generate_random_key_between(0, 80));

	console.log(res);
	

	


	// console.log(`ME: ${larosa.node_info.node_id}`)
	// console.log(`BOOSTRAP NODE: ${bootstrap_node.node_info.node_id}`)




	


	// (async function doshit() {
	// 	await client_node.join(bootstrap_node.node_info);

	// 	client_node.store(BigInt(500), "Hey it's some arbitrary data bro");

	// 	setTimeout(async () => {
	// 		const result = await client_node.find(BigInt(500));

	// 		console.log(result);
	// 	}, 5000)
	// })()



	// (async function pht_test() {
	// 	await larosa.join(bootstrap_node.node_info);

	// 	const res = await larosa_pht.lookup_lin(Hnode.generate_random_key_between(0, 80));

	// 	console.log(res);

	// })();
}
