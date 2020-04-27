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
const { Hgeo_coord } = require("../hgeo/hgeo_coord.js"); // TODO: Should we include the hgeo module top level source file? Gotta figure out a plan 
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
new Promise((resolve, reject) => {
	for (let i = 0; i < 200; i += 1) {
		(async function() {
			const message_eng = new Heng_alpha();
			const local_simulator = new Htrans_sim();
			const node = new Hnode({eng: message_eng, trans: local_simulator});
			my_local_simulator._add_peer(node);
			await node.bootstrap(bootstrap_node.node_info);

			// console.log(`A peer node has joined: ${node.node_info.node_id}`)
		})();	
	}

	resolve();
}).then(() => {
	doit();
});


async function doit() {



	// Create a message engine module
	const my_preferred_message_eng = new Heng_alpha();

	// Create a DHT node for me, Pizzeria La Rosa
	const larosa = new Hnode({eng: my_preferred_message_eng, trans: my_local_simulator});

	// Add me to the local simulator
	my_local_simulator._add_peer(larosa);

	// Bootstrap my DHT node and join the network
	await larosa.bootstrap(bootstrap_node.node_info);


	// Create a PHT interface for La Rosa
	const larosa_pht = new Hpht({
		index_attr: "___h00dn3t.geoha$h!!",
		dht_lookup: larosa._node_lookup, 
		dht_lookup_args: [larosa._req_find_value], 
		dht_node: larosa
	});

	// Init the PHT interface (idempotently checks for root structure)
	await larosa_pht.init();
	await larosa_pht.init();

	// Create geo object for our location in the real world -- this should happen before we bootstrap the DHT node, and we should bootstrap using the linearization of this object as our NODE ID
	const our_location = new Hgeo_coord({lat: 40.9018663, long: -73.7912739});

	// This should be an "add_menu()" command at the highest protocol level
	// await larosa_pht.insert(our_location.linearize(), "Pepperoni pizza and salad and shit bro, this is our menu right here");






	// console.log(res2.get(our_location.linearize()));

	// await larosa_pht._print_stats();

	for (let i = 0; i < 100; i += 1) {
		await larosa_pht.insert(BigInt(i), i);
	}

	await larosa_pht._debug_print_stats();

	await larosa_pht._debug_print_stats();

	await larosa_pht._debug_print_stats();

	await larosa_pht._debug_print_stats();

	await larosa_pht._debug_print_stats();

	await larosa_pht._debug_print_stats();

	await larosa_pht._debug_print_stats();

	my_local_simulator._debug_dump_network_state();

	
	


	// const root_node = await larosa_pht._debug_get_root_node();

	// console.log(root_node);


	// const child0 = await larosa_pht.lookup_lin(root_node.children[0x00]);

	// console.log(child0);


	// await larosa_pht.insert(BigInt(31337), "Some other shit dog");

	// await larosa_pht._print_stats();

	// await larosa_pht.insert(BigInt(0xdeadbeef), "Some other shit dog");
	
	// await larosa_pht._print_stats();

	// await larosa_pht.insert(BigInt(3133777), "Some other shit dogsdfsdfsdfsdf");

	// await larosa_pht._print_stats();



	


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
