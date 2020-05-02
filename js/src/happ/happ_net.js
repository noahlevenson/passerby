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

// Make a bootstrap node with UDP transport that lives on the default port
const bootstrap_udp_trans = new Htrans_udp();
const bnet = new Hkad_net_solo(bootstrap_udp_trans);
const beng = new Hkad_eng_alpha();
const bootstrap_node = new Hkad_node({eng: beng, net: bnet, port: bootstrap_udp_trans.port});


// Create a node for me, Pizzeria La Rosa
const larosa_udp_trans = new Htrans_udp({port: 31337});
const larosa_net = new Hkad_net_solo(larosa_udp_trans);
const larosa_eng = new Hkad_eng_alpha();
const larosa = new Hkad_node({eng: larosa_eng, net: larosa_net, port: larosa_udp_trans.port});

doit();


async function doit() {
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
}
