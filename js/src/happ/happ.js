/** 
* HAPP 
* Top level protocol interface
*
*
*
*
*/ 

"use strict";

const { Happ_env } = require("./happ_env.js");
const { Happ_bboard } = require("./happ_bboard.js");
const { Htrans_udp } = require("../htrans/trans/htrans_udp.js");
const { Hkad_node } = require("../hkad/hkad_node.js");
const { Hkad_eng_alpha } = require("../hkad/eng/hkad_eng_alpha.js");
const { Hkad_net_solo } = require("../hkad/net/hkad_net_solo.js");
const { Hkad_net_sim } = require("../hkad/net/hkad_net_sim.js");
const { Hid } = require("../hid/hid.js");
const { Hgeo } = require("../hgeo/hgeo.js");
const { Hgeo_coord } = require("../hgeo/hgeo_coord.js");
const { Hgeo_rect } = require("../hgeo/hgeo_rect.js");
const { Hpht } = require("../hpht/hpht.js");
const { Hstun } = require("../hstun/hstun.js");
const { Hstun_net_solo } = require("../hstun/net/hstun_net_solo.js");
const { Hdlt } = require("../hdlt/hdlt.js");
const { Hdlt_net_solo } = require("../hdlt/net/hdlt_net_solo.js");
const { Hksrv } = require("../hksrv/hksrv.js"); 
const { Hbuy } = require("../hbuy/hbuy.js");
const { Hbuy_ffment } = require("../hbuy/hbuy_ffment.js");
const { Hbuy_status } = require("../hbuy/hbuy_status.js");
const { Hbuy_sms } = require("../hbuy/hbuy_sms.js");
const { Hbuy_net_solo } = require("../hbuy/net/hbuy_net_solo.js");
const { Hbuy_menu } = require("../hbuy/hbuy_menu.js"); 
const { Hbuy_item_ref } = require("../hbuy/hbuy_item_ref.js");
const { Hbuy_item_misc } = require("../hbuy/hbuy_item_misc.js");
const { Hbuy_tsact } = require("../hbuy/hbuy_tsact.js");
const { Hntree } = require("../htypes/hntree/hntree.js");
const { Hutil } = require("../hutil/hutil.js"); 
const { Hlog } = require("../hlog/hlog.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");
const https = Happ_env.BROWSER ? null : require("https");

class Happ {
	static USER_AGENT = "Free Food (https://freefood.is)"; // Currently used only for geocoding API calls
	static GEO_INDEX_ATTR = "___h34v3n.geoha$h!!";
	static SEARCH_DIST_MILES = 2.0;
	static T_NAT_KEEPALIVE = 20000;

	static GEOCODING_METHOD = {
		NOMINATIM: 0
	};

	static GEOCODING_HOSTS = new Map([
		[Happ.GEOCODING_METHOD.NOMINATIM, ["nominatim.openstreetmap.org"]]
	]);

	static GEOCODING_HANDLER = new Map([
		[Happ.GEOCODING_METHOD.NOMINATIM, Happ._geocoding_handler_nominatim]
	]);

	static BOOTSTRAP_NODES = [
		["66.228.34.29", 27500]
	];

	port;
	hid;
	hpht;
	hbuy;
	hksrv;
	node;
    trans;
	keepalive;
	keepalive_interval_handle;
	geocoding;

	// Currently we can only create one kind of Happ instance - it implements a single UDP transport module, full STUN services,
	// a DHT peer with a node id equal to the hash of its public key, and and a PHT interface (indexing on GEO_INDEX_ATTR)
	// TODO: Parameterize this to create different kinds of Happ instances
	constructor({hid_pub = null, port = 27500, keepalive = true, geocoding = Happ.GEOCODING_METHOD.NOMINATIM} = {}) {
		// Give JavaScript's built-in Map type a serializer and a deserializer
		Object.defineProperty(global.Map.prototype, "toJSON", {
			value: Hutil._map_to_json
		});

		Object.defineProperty(global.Map, "from_json", {
			value: Hutil._map_from_json
		});

		this.hid_pub = hid_pub;
		this.port = port;
		this.hpht = null;
		this.hbuy = null;
		this.node = null;
		this.trans = null;
        this.keepalive = keepalive;
		this.keepalive_interval_handle = null;
		this.geocoding = geocoding;
	}

	// Convenience method to generate a public/private key pair
	static generate_key_pair() {
		return Hid.generate_key_pair();
	}

	// Convenience method to cryptographically sign some data
	static sign(data, key) {
		return Hid.sign(data, key);
	}

	// Convenience method to verify a cryptographic signature
	static verify(data, key, sig) {
		return Hid.verify(data, key, sig);
	}
    
	// Compute the peer ID derived from input 'data'
	// Free Food requires peer IDs to be equal to the hash of its public key computed in this fashion
	static get_peer_id(data) {
		return new Hbigint(Hutil._sha1(data));
	}

	// Derive a lat/long pair from an address using the specified geocoding method
	static async geocode({street, city, state, postalcode, method} = {}) {
		const hosts = Happ.GEOCODING_HOSTS.get(method);
		let i = 0;

		while (i < hosts.length) {
			try {
				return await Happ.GEOCODING_HANDLER.get(method)({
					hostname: hosts[i], 
					street: street, 
					city: city, 
					state: state, 
					postalcode: postalcode
				});
			} catch (err) {
				i += 1;
			}
		}

		throw new Error(`All hosts for geocoding method ${Object.keys(Happ.GEOCODING_METHOD)[method]} failed!`);
	}

	static _geocoding_handler_nominatim({hostname, street, city, state, postalcode} = {}) {
		if (Happ_env.BROWSER) {
			// TODO: do the browser implementation using XMLHttpRequest (or, worst case scenario, use RN "Fetch" API)
			throw new Error("No browser implementation for HTTPS requests yet!"); 
		}

		const query = new URLSearchParams([
			["street", street],
			["city", city],
			["state", state],
			["postalcode", postalcode],
			["format", "json"]
		]);

		const opt = {
			hostname: hostname,
			headers: {"User-Agent": Happ.USER_AGENT},
			path: `/search?${query.toString()}`,
			timeout: 3000
		};

		return new Promise((resolve, reject) => {
			const req = https.request(opt, (res) => {
				res.on("data", (d) => {
					try {
						const parsed = JSON.parse(d)[0];
						resolve(new Hgeo_coord({lat: parseFloat(parsed.lat), long: parseFloat(parsed.lon)}));
					} catch (err) {
						reject(err);
					}
				});
			});

			req.end();
		});
	}

	// Convenience method: send a transaction request to the peer named on credential 'cred' and
	// listen once for Hbuy_status.CODE.CONFIRMED, calling status_cb if we hear it
	// Immediately returns the transaction ID as a string without regard for the success or failure of the operation
	send_transaction({cred, order, pment, success = () => {}, timeout = () => {}, status_cb} = {}) {
		// TODO: verify the credential!

		const transaction = new Hbuy_tsact({
	    	order: order,
	        pment: pment,
	        from: this.hid_pub, // TODO: How should we handle different addresses?
	        id: Hbigint.random(Hbuy_tsact.ID_LEN).toString()
    	});

		// Set up the status listener before sending the transaction to avoid a race condition 
		// TODO: we never cancel this this listener - it should be cancelled if the transaction
		// request fails due to timeout or error
		this.on_status({transact_id: transaction.id, status_code: Hbuy_status.CODE.CONFIRMED, cb: status_cb});

		this.search_node_info(Happ.get_peer_id(cred.pubkey)).then((res) => {
			this.hbuy.transact_req({
		  		hbuy_transaction: transaction,
		        addr: res.addr,
		        port: res.port,
		        success: success,
		        timeout: timeout
	    	});
		}).catch((err) => {
			// TODO: Handle any error
			timeout();
		});

		return transaction.id;
	}

	// Convenience method to send an SMS to the peer associated with public key 'pubkey', immediately returns a 
	// reference to the Hbuy_sms object, without regard for the success or failure of the operation
	send_sms({pubkey, text, data, success = () => {}, timeout = () => {}}) {
		const sms = new Hbuy_sms({
			text: text,
			from: this.hid_pub,
			data: data
		});

		// Do this right away but don't wait for it
		this.search_node_info(Happ.get_peer_id(pubkey)).then((res) => {
			this.hbuy.sms_req({
				hbuy_sms: sms,
				addr: res.addr,
				port: res.port,
				success: success,
				timeout: timeout
			});
		}).catch((err) => {
			// TODO: Handle any error
			timeout();
		});

		return sms;
	}

	// Convenience method to send a status message to the peer associated with the public key 'pubkey'
	// returns a reference to the Hbuy_status object
	send_status({pubkey, trans_id, code, success = () => {}, timeout = () => {}}) {
		const status = new Hbuy_status({
			id: trans_id,
			code: code
		});

		this.search_node_info(Happ.get_peer_id(pubkey)).then((res) => {
			this.hbuy.status_req({
				hbuy_status: status,
				addr: res.addr,
				port: res.port,
				success: success,
				timeout: timeout
			});
		}).catch((err) => {
			// TODO: Handle any error
			timeout();
		});

		return status;
	}

	// Convenience method which wraps hbuy.on_status: subscribe only once to the next status event for a given transaction ID and status code
	on_status({transact_id, status_code, cb} = {}) {
		this.hbuy.on_status(transact_id, status_code, cb);
	}

	// Convenience method which wraps hbuy.on_sms: set the handler function for sms messages
	on_sms({f} = {}) {
		this.hbuy.on_sms(f);
	}

    // Convenience method to return the enum-like object representing our controlled folksonomy of menu keywords
    get_menu_keywords() {
        return Hbuy_menu.KEYWORDS;
    }

    // Convenience method to return the enum-like object representing our fulfillment types
    get_ffment_types() {
    	return Hbuy_ffment.TYPE;
    }

    // Convenience factory method to create an Hbuy_item_ref
    create_item_ref({menu = null, froz_idx = null, size_idx = null, cust_cats_idx = [], qty = 1, comment = null} = {}) {
		return new Hbuy_item_ref({
			form_id: this.get_form_id(menu),
			froz_idx: froz_idx,
			size_idx: size_idx,
			cust_cats_idx: cust_cats_idx,
			qty: qty,
			comment: comment
		});
    }

    // Convenience factory method to create an Hbuy_item_misc
    create_item_misc({desc, price, qty} = {}) {
    	return new Hbuy_item_misc({
    		desc: desc,
    		price: price,
    		qty: qty
    	});
    }

    // Convenience method to compute the form ID for an Hbuy_menu (which will eventually be a subclass of Hbuy_form)
    get_form_id(hbuy_form) {
    	return Hbuy_menu.get_form_id(hbuy_form);
    }

	// Return a reference to our DHT node
	get_node() {
		return this.node;
	}

	// Get our peer ID as an Hbigint
	my_id() {
		return new Hbigint(this.hid_pub.peer_id); 
	}

	// Return a reference to our latitude/longitude as an Hgeo_coord
	get_location() {
		return new Hgeo_coord({lat: this.hid_pub.lat, long: this.hid_pub.long});
	}

	// Search the network for the Hkad_node_info object for a given node_id as Hbigint (returns null if unable to resolve)
	async search_node_info(node_id) {
		const data = await this.node._node_lookup(node_id);

		if (data.payload[0].node_id.equals(node_id)) {
			return data.payload[0];
		}

		return null;
	}

	// Publish a Happ_bboard to the network under our location key
	async put(bboard) {
		await this.hpht.insert(this.get_location().linearize(), bboard);
	}

	// This is the highest level function for retrieving a list of nearby restaurant peers
	async get_local_resources() {
        const loc = this.get_location();
		const search_window = Hgeo.get_exts(loc, Happ.SEARCH_DIST_MILES);
		const res = await this.geosearch(search_window);
        Hlog.log(`[HAPP] Searched ${Happ.SEARCH_DIST_MILES.toFixed(1)} miles from ${loc.lat}, ${loc.long}; resources discovered: ${res.length}`);
        return res;
	}

	// Search the network for data within a geographic window defined by an Hgeo_rect
	// this is a somewhat lower level operation - for performing a standard search for
	// nearby restaurants, use get_local_resources above
	async geosearch(rect) {
		return await this.hpht.range_query_2d(rect.get_min().linearize(), rect.get_max().linearize());
	}

	// Boot this instance and join the network
	// To boot as a bootstrap node, pass addr and port
	async start({addr = null, port = null} = {}) {
		// Create and boot a UDP transport module
		const happ_udp_trans = new Htrans_udp({port: this.port});
		await happ_udp_trans._start();
        
        this.trans = happ_udp_trans;

		// Create and start STUN services
		const happ_stun_net = new Hstun_net_solo(happ_udp_trans);
		const happ_stun_service = new Hstun({net: happ_stun_net});

		let addr_port = null;

		if (addr !== null && port !== null) {
			addr_port = [addr, port];
		} else {
			// Try all of our known bootstrap nodes' STUN servers to resolve our external addr and port (we only need one response)
			for (let i = 0; i < Happ.BOOTSTRAP_NODES.length && addr_port === null; i += 1) {
				addr_port = await happ_stun_service._binding_req(Happ.BOOTSTRAP_NODES[i][0], Happ.BOOTSTRAP_NODES[i][1]);
			}
		}

		if (addr_port === null) {
			throw new Error("STUN binding request failed!");
		}

		// Create a DHT node
		const peer_node = new Hkad_node({
			eng: new Hkad_eng_alpha(), 
			net: new Hkad_net_solo(happ_udp_trans), 
			addr: addr_port[0],
			port: addr_port[1],
			id: this.my_id()
		});

		this.node = peer_node;

		// TODO: Should we bootstrap with more than one node? Bootstrap with every bootstrap node in our list?
		let bootstrap_res = false;

		for (let i = 0; i < Happ.BOOTSTRAP_NODES.length && bootstrap_res === false; i += 1) {
			bootstrap_res = await peer_node.bootstrap({addr: Happ.BOOTSTRAP_NODES[i][0], port: Happ.BOOTSTRAP_NODES[i][1]});
		}

		if (!bootstrap_res) {
			throw new Error("DHT bootstrap failed!");
		}

		// TODO: Keepalive should send a much smaller packet than this (it's a STUN request wrapped in an HTRANS msg)
		if (this.keepalive) {
			this.keepalive_interval_handle = setInterval(async () => {
				let res = null;

				for (let i = 0; i < Happ.BOOTSTRAP_NODES.length && res === null; i += 1) {
					res = await happ_stun_service._binding_req(Happ.BOOTSTRAP_NODES[i][0], Happ.BOOTSTRAP_NODES[i][1]);
				}
			}, Happ.T_NAT_KEEPALIVE);

			Hlog.log(`[HAPP] NAT keepalive enabled (${Happ.T_NAT_KEEPALIVE / 1000}s)`);
		}

		// Create a PHT interface
		this.hpht = new Hpht({
			index_attr: Happ.GEO_INDEX_ATTR,
			dht_lookup_func: peer_node._node_lookup, 
			dht_lookup_args: [peer_node._req_find_value], 
			dht_node: peer_node,
			dht_ttl: Hkad_node.T_DATA_TTL
		});

		// Idempotently initialize the PHT
		await this.hpht.init();

		// Create and start the default HKSRV interface
		const ksrv_dlt = new Hdlt({
			net: new Hdlt_net_solo(happ_udp_trans),
			hkad: peer_node,
			consensus: Hdlt.CONSENSUS_METHOD.AUTH, 
			args: [], // TODO: add the authorities!
			app_id: "keyserver1"
		});

		this.hksrv = new Hksrv({dlt: ksrv_dlt});
		this.hksrv.start();

		// Create and start an HBUY interface
		const happ_hbuy_net = new Hbuy_net_solo(happ_udp_trans);
		this.hbuy = new Hbuy({net: happ_hbuy_net, hid_pub: this.hid_pub});
		this.hbuy.start();
	}

	// Disconnect from the network (currently only works with the one kind of Happ instance we can create)
	async stop() {
		try {
			if (this.trans) {
				this.trans._stop()
				this.hpht = null;
				this.node = null;
			}

			if (this.keepalive_interval_handle) {
				clearInterval(this.keepalive_interval_handle);
				this.keepalive_interval_handle = null;
			}
		} catch {
			// Do nothing
		}
	}

	// Perform a network test by pinging all our bootstrap nodes in a random sequence - returns IP addr of first PONG, null if network failure
	async net_test() {
		if (!this.node) {
			return null;
		}

		const bstrap = Array.from(Happ.BOOTSTRAP_NODES);

		while (bstrap.length > 0) {
			const peer = bstrap.splice(Math.floor(Math.random() * bstrap.length), 1);

			const res = await new Promise((resolve, reject) => {
				this.node._req_ping({addr: peer[0][0], port: peer[0][1], node_id: new Hbigint(-1)}, (res, ctx) => { 
					resolve(peer[0][0]);
				}, () => {
					resolve(null);
				});
			});

			if (res) {
				return res;
			}
		}

		return null;
	}

	// Boot this instance on a local network simulation
	// local_sim must be an instance of Hkad_net_sim (to assign local_sim as this node's net module, set use_local_sim to true)
	// To make this node a bootstrap node, just don't supply a value for bootstrap_node
	async _debug_sim_start({bootstrap_node = null, local_sim = null, random_id = true, use_local_sim = false} = {}) {
		// Create a DHT node
		const peer_node = new Hkad_node({
			eng: new Hkad_eng_alpha(), 
			net: use_local_sim ? local_sim : new Hkad_net_sim(), 
			id: random_id ? null : this.my_id()
		});

		this.node = peer_node;
	
		local_sim._add_peer(peer_node);
		await this.node.bootstrap(bootstrap_node === null ? peer_node.node_info : bootstrap_node.get_node());

		// Create a PHT interface
		this.hpht = new Hpht({

			index_attr: Happ.GEO_INDEX_ATTR,
			dht_lookup_func: peer_node._node_lookup, 
			dht_lookup_args: [peer_node._req_find_value], 
			dht_node: peer_node,
			dht_ttl: Hkad_node.T_DATA_TTL
		});

		// Idempotently initialize the PHT
		await this.hpht.init();
		console.log("");
	}
}

module.exports.Happ = Happ;
