"use strict";

const { Htrans_udp } = require("../htrans/trans/htrans_udp.js");

const { Hkad_node } = require("../hkad/hkad_node.js");
const { Hkad_eng_alpha } = require("../hkad/eng/hkad_eng_alpha.js");
const { Hkad_net_solo } = require("../hkad/net/hkad_net_solo.js");

const { Hgeo_coord } = require("../hgeo/hgeo_coord.js"); // TODO: Should we include the hgeo module top level source file? Gotta figure out a plan 
const { Hgeo_rect } = require("../hgeo/hgeo_rect.js");
const { Hpht } = require("../hpht/hpht.js");

const { Hstun } = require("../hstun/hstun.js");
const { Hstun_net_solo } = require("../hstun/net/hstun_net_solo.js");

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
	const bootstrap_node = new Hkad_node({eng: beng, net: bnet, addr: "localhost", 
		port: bootstrap_udp_trans.port});
	
	// Give it STUN services
	const bootstrap_node_stun_net = new Hstun_net_solo(bootstrap_udp_trans);
	const bootstrap_node_stun_service = new Hstun({net: bootstrap_node_stun_net});




	// For me, Pizzeria La Rosa, create a UDP transport
	const larosa_udp_trans = new Htrans_udp({port: 31337});
	await larosa_udp_trans._start();

	// For me, Pizzeria La Rosa, start up our STUN services:
	const larosa_stun_net = new Hstun_net_solo(larosa_udp_trans);
	const larosa_stun_service = new Hstun({net: larosa_stun_net});

	// For me, Pizzeria La Rosa, first thing: hit a bootstrap node's STUN server and resolve our external addr/port info...
	const stun_res = await larosa_stun_service._binding_req("localhost", 27500);

	if (stun_res === null) {
		throw new Error("STUN binding request failed!");
	}

	// Now let's generate our node ID -- that's gonna be the z-curve linearization of our lat/long coords
	const our_location = new Hgeo_coord({lat: 40.9018663, long: -73.7912739});

	// Currently, node ID's are the 160-bit SHA1 hash of our 80-bit linearization...
	// since menu data keys are 80-bit linearizations, clients can connect directly to restaurants
	// by taking the 160-bit SHA1 hash of the menu they want to order from, and then finding the node_info 
	// for the node with that node ID
	const our_node_id = BigInt(`0x${Hutil._sha1(our_location.linearize().toString(16))}`);

	// Now we can finally create our HKAD node...
	const larosa_net = new Hkad_net_solo(larosa_udp_trans);
	const larosa_eng = new Hkad_eng_alpha();
	
	const larosa = new Hkad_node({
		eng: larosa_eng, 
		net: larosa_net, 
		addr: stun_res[0],
		port: stun_res[1],
		id: our_node_id
	});


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


	// console.log(bootstrap_node.node_info);

	// console.log(larosa.node_info)


	
}
