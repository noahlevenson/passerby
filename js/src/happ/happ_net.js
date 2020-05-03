"use strict";

const { Htrans_udp } = require("../htrans/trans/htrans_udp.js");

const { Hkad_node } = require("../hkad/hkad_node.js");
const { Hkad_eng_alpha } = require("../hkad/eng/hkad_eng_alpha.js");
const { Hkad_net_solo } = require("../hkad/net/hkad_net_solo.js");

const { Hgeo_coord } = require("../hgeo/hgeo_coord.js"); // TODO: Should we include the hgeo module top level source file? Gotta figure out a plan 
const { Hgeo_rect } = require("../hgeo/hgeo_rect.js");
const { Hpht } = require("../hpht/hpht.js");

const { Hutil } = require("../hutil/hutil.js"); // DELETE ME!!!

// Give BigInts a serialization method -- this needs to execute early, so I guess this is the best place to put it
BigInt.prototype.toJSON = Hutil._bigint_to_json;

// Give Map type a serializer too
Map.prototype.toJSON = Hutil._map_to_json;

// For maps, also add this constructor function
Map.from_json = Hutil._map_from_json;


doit();


async function doit() {
	// Make a bootstrap node with UDP transport that lives on the default port
	const bootstrap_udp_trans = new Htrans_udp();
	await bootstrap_udp_trans._start();
	const bnet = new Hkad_net_solo(bootstrap_udp_trans);
	const beng = new Hkad_eng_alpha();
	const bootstrap_node = new Hkad_node({eng: beng, net: bnet, port: bootstrap_udp_trans.port});


	// Create a node for me, Pizzeria La Rosa
	const larosa_udp_trans = new Htrans_udp({port: 31337});
	await larosa_udp_trans._start();
	const larosa_net = new Hkad_net_solo(larosa_udp_trans);
	const larosa_eng = new Hkad_eng_alpha();
	const larosa = new Hkad_node({eng: larosa_eng, net: larosa_net, port: larosa_udp_trans.port});


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


	// for (let i = 0; i < 2000; i += 1) {
	// 	await larosa_pht.insert(BigInt(i), i);
	// }




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


	await larosa_pht._debug_print_stats();


	


	
}
