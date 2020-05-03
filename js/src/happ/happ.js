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

const { Hkad_node } = require("../hkad/hkad_node.js");
const { Hkad_eng_alpha } = require("../hkad/eng/hkad_eng_alpha.js");
const { Hkad_net_sim } = require("../hkad/net/hkad_net_sim.js");
const { Hgeo_coord } = require("../hgeo/hgeo_coord.js"); // TODO: Should we include the hgeo module top level source file? Gotta figure out a plan 
const { Hgeo_rect } = require("../hgeo/hgeo_rect.js");
const { Hpht } = require("../hpht/hpht.js");

const { Htrans_udp } = require("../htrans/trans/htrans_udp.js");


const { Hutil } = require("../hutil/hutil.js"); // DELETE ME!!!

// Is the hoodnet.js file necessary in the distribution? Do want to maybe move some global constants here?

// Give BigInts a serialization method -- this needs to execute early, so I guess this is the best place to put it
BigInt.prototype.toJSON = Hutil._bigint_to_json;

// Give Map type a serializer too
Map.prototype.toJSON = Hutil._map_to_json;

// For maps, also add this constructor function
Map.from_json = Hutil._map_from_json;




// Make a bootstrap node
const beng = new Hkad_eng_alpha();
const bnet = new Hkad_net_sim();
const bootstrap_node = new Hkad_node({eng: beng, net: bnet});

// Create a simulator net module
const my_local_simulator = new Hkad_net_sim();

// Add the bootstrap node to the local simulator
my_local_simulator._add_peer(bootstrap_node);


// Now let's add some other nodes to the simulated network
new Promise((resolve, reject) => {
	for (let i = 0; i < 100; i += 1) {
		(async function() {
			const message_eng = new Hkad_eng_alpha();
			const local_simulator = new Hkad_net_sim();
			const node = new Hkad_node({eng: message_eng, net: local_simulator});
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
	const my_preferred_message_eng = new Hkad_eng_alpha();

	// Create a DHT node for me, Pizzeria La Rosa
	const larosa = new Hkad_node({eng: my_preferred_message_eng, net: my_local_simulator});


	// Add me to the local simulator
	my_local_simulator._add_peer(larosa);

	

	// Bootstrap my DHT node and join the network
	await larosa.bootstrap(bootstrap_node.node_info);


	// Create a PHT interface for La Rosa
	const larosa_pht = new Hpht({
		index_attr: "___h00dn3t.geoha$h!!",
		dht_lookup_func: larosa._node_lookup, 
		dht_lookup_args: [larosa._req_find_value], 
		dht_node: larosa
	});

	// Init the PHT interface (idempotently checks for root structure)
	await larosa_pht.init();
	await larosa_pht.init();

	// larosa._debug_watch(larosa_pht._get_label_hash("01"));

	// Create geo object for our location in the real world -- this should happen before we bootstrap the DHT node, and we should bootstrap using the linearization of this object as our NODE ID
	const our_location = new Hgeo_coord({lat: 40.9018663, long: -73.7912739});

	// This should be an "add_menu()" command at the highest protocol level
	await larosa_pht.insert(our_location.linearize(), "Pizzeria La Rosa");


	// Add some other restaurants that are not within our window!!!!!
	const spumoni_gardens = new Hgeo_coord({lat: 40.5947235, long: -73.98131332751743});
	await larosa_pht.insert(spumoni_gardens.linearize(), "L&B Spumoni Gardens");

	const pinos = new Hgeo_coord({lat: 40.6713257, long: -73.9776937});
	await larosa_pht.insert(pinos.linearize(), "Pino's La Forchetta");

	const modern_pizza = new Hgeo_coord({lat: 40.9089094, long: -73.7842226});
	await larosa_pht.insert(modern_pizza.linearize(), "Modern Pizza & Restaurant");
	
	// THIS WILL BE SHIT YOU IMPLEMENT AT THE PROTOCOL LAYER:
	// latmin, longmin is always gonna be the bottom left corner
	// latmax, longmax is always gonna be the top right corner

	// this map subwindow describes a large area that encompasses la rosa, the north bronx, mount vernon, larchmont
	const westchester = new Hgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
	const res1 = await larosa_pht.range_query_2d(westchester.get_min().linearize(), westchester.get_max().linearize());


	console.log("WESTCHESTER:");
	console.log(res1);

	// this map subwindow describes a smallish area that encompasses most of park slope and some of gowanus
	const park_slope = new Hgeo_rect({bottom: 40.66203, left: -74.00236, top: 40.67219, right: -73.96271});
	const res2 = await larosa_pht.range_query_2d(park_slope.get_min().linearize(), park_slope.get_max().linearize());

	console.log("PARK SLOPE:");
	console.log(res2);

	// this map subwindow describes a small area that encompasses a region of prospect heights
	const prospect_heights = new Hgeo_rect({bottom: 40.65347, left: -73.96451, top: 40.66929, right: -73.92451});
	const res3 = await larosa_pht.range_query_2d(prospect_heights.get_min().linearize(), prospect_heights.get_max().linearize());

	console.log("PROSPECT HEIGHTS:");
	console.log(res3);

	// this map subwindow describes a small region of south brooklyn encompassing L&B Spumoni Gardens
	const south_bk = new Hgeo_rect({bottom: 40.59046, left: -73.99054, top: 40.59838, right: -73.97054});
	const res4 = await larosa_pht.range_query_2d(south_bk.get_min().linearize(), south_bk.get_max().linearize());

	console.log("SOUTH BROOKLYN:");
	console.log(res4);









	// Write a thing to myself here explaining how range query works at the protocol level - why does it work? what work
	// does the protocol layer have to do to assemble and get a range query?








	// console.log(min);
	// console.log(max);



	// for (let i = 0; i < 1000; i += 1) {
	// 	await larosa_pht.insert(BigInt(i), i);
	// }

	// await larosa_pht._debug_print_stats();

	

	// my_local_simulator._debug_dump_network_state();


	// for (let i = 1000; i >= 0; i -= 1) {
	// 	await larosa_pht.delete(BigInt(i));
	// }

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

	// 	const res = await larosa_pht.lookup_lin(Hkad_node.generate_random_key_between(0, 80));

	// 	console.log(res);

	// })();
}
