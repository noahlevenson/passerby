"use strict";

const { Htrans_udp } = require("../htrans/trans/htrans_udp.js");
const { Hkad_node } = require("../hkad/hkad_node.js");
const { Hkad_eng_alpha } = require("../hkad/eng/hkad_eng_alpha.js");
const { Hkad_net_solo } = require("../hkad/net/hkad_net_solo.js");
const { Hgeo_coord } = require("../hgeo/hgeo_coord.js");
const { Hgeo_rect } = require("../hgeo/hgeo_rect.js");
const { Hpht } = require("../hpht/hpht.js");
const { Hstun } = require("../hstun/hstun.js");
const { Hstun_net_solo } = require("../hstun/net/hstun_net_solo.js");
const { Hutil } = require("../hutil/hutil.js"); 
const { Hbigint } = require("../htypes/hbigint/hbigint_node.js");

// Happ is the highest level protocol interface
class Happ {
	static GEO_INDEX_ATTR = "___h00dn3t.geoha$h!!";

	static BOOTSTRAP_NODES = [
		["66.228.34.29", 27500]
	];

	loc;
	port;
	pht;

	// Currently we can only create one kind of Happ instance - it implements a single UDP transport module, full STUN services,
	// a DHT peer with a node id equal to the hash of the z-curve linearization of our lat/long coords, and a PHT interface (indexing on GEO_INDEX_ATTR)
	constructor({lat = null, long = null, port = 27500} = {}) {
		// TODO: validation
		this.loc = new Hgeo_coord({lat: lat, long: long});
		this.port = port;
		this.pht = null;
	}

	// Return our location object
	get_location() {
		return this.loc;
	}

	// Get our ID - the hash of the z-curve linearization of our lat/long coords
	get_id() {
		return new Hbigint(Hutil._sha1(this.get_location().linearize().toString()));
	}

	// Get the node ID associated with a data (menu) key (key as string)
	get_node_id_for_key(key) {
		return new Hbigint(Hutil._sha1(key));
	}

	// Put data (menu) associated with our geolocation to the network
	async put(data) {
		await this.pht.insert(this.get_location().linearize(), data);
	}

	// Search the network for data (menus) within a geographic window defined by an Hgeo_rect
	async geosearch(rect) {
		return await this.pht.range_query_2d(rect.get_min().linearize(), rect.get_max().linearize());
	}

	// Boot this instance
	// To boot as a bootstrap node, pass addr and port
	async start({addr = null, port = null} = {}) {
		// Give JS Map type a serializer
		Map.prototype.toJSON = Hutil._map_to_json;

		// Give JS Map type a deserializer
		Map.from_json = Hutil._map_from_json;

		// Create and boot a UDP transport module
		const happ_udp_trans = new Htrans_udp({port: this.port});
		await happ_udp_trans._start();

		// Create and start STUN services
		const happ_stun_net = new Hstun_net_solo(happ_udp_trans);
		const happ_stun_service = new Hstun({net: happ_stun_net});

		let addr_port = null;

		if (addr !== null && port !== null) {
			addr_port = [addr, port];
		} else {
			// Try all of our known bootstrap nodes' STUN servers to resolve our addr and port (we only need one response)
			for (let i = 0; i < Happ.BOOTSTRAP_NODES.length && addr_port === null; i += 1) {
				addr_port = await happ_stun_service._binding_req(Happ.BOOTSTRAP_NODES[i][0], Happ.BOOTSTRAP_NODES[i][1]);
			}
		}

		if (addr_port === null) {
			throw new Error("STUN binding request failed!");
		}

		// Create a DHT node
		const happ_kad_net = new Hkad_net_solo(happ_udp_trans);
		const happ_kad_eng = new Hkad_eng_alpha();
		
		const peer_node = new Hkad_node({
			eng: happ_kad_eng, 
			net: happ_kad_net, 
			addr: addr_port[0],
			port: addr_port[1],
			id: this.get_id()
		});

		// TODO: Should we bootstrap on more than one node?
		let bootstrap_res = false;

		for (let i = 0; i < Happ.BOOTSTRAP_NODES.length && bootstrap_res === false; i += 1) {
			bootstrap_res = await peer_node.bootstrap({addr: Happ.BOOTSTRAP_NODES[i][0], port: Happ.BOOTSTRAP_NODES[i][1]});
		}

		if (!bootstrap_res) {
			throw new Error("DHT bootstrap failed!");
		}

		// Create a PHT interface
		this.pht = new Hpht({
			index_attr: Happ.GEO_INDEX_ATTR,
			dht_lookup_func: peer_node._node_lookup, 
			dht_lookup_args: [peer_node._req_find_value], 
			dht_node: peer_node
		});

		// Idempotently initialize the PHT
		await this.pht.init();
	}
}

module.exports.Happ = Happ;