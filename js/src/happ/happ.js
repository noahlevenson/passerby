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
const { Hbigint } = Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE ? require("../htypes/hbigint/hbigint_rn.js") : require("../htypes/hbigint/hbigint_node.js");
const https = Happ_env.ENV === Happ_env.ENV_TYPE.NODE ? require("https") : null;

class Happ {
	static USER_AGENT = "Free Food (https://freefood.is)"; // Currently used only for geocoding API calls
	static GEO_INDEX_ATTR = "___h34v3n.geoha$h!!";
	static KEYSERVER_APP_ID = "k";
	static KEYSERVER_BLOCK_RATE = [10000, 20000];
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

	static AUTHORITIES = [
		'30820122300d06092a864886f70d01010105000382010f003082010a0282010100a6108c362961ff79246467b1b0c8505aac91fde23daa711e297f4601b053acb18c2e90defbaba60bdfee93fbab3c1d0d0559a50dfb5d0356bee484814a786f7b9e679e6ed822ff77bfc2c4fcc232e418aa5ebddcbbaa27d63939108a3bd91694c0f347fc1038d151306eecd0630719809aa4187c0d1dab1bb132ff0df29cbd5342ed32d51d1db053ecb6eacc7c998a19d3f46534d0d9b70d706ef8f90d75431a8a192f772170b7c97e1f97e651d7ec5ca00a8bf2f5a896e232750f0ecf9007bfdd51550c6a0da554c79a64dc4164c71885682d75e278c0fc27db1942b4d15d48c9ff9c2aa8f1e9b77d211a4ae8aa56927cf9393dc71121d97eadb52c555bba310203010001',
		'30820122300d06092a864886f70d01010105000382010f003082010a0282010100ae76dbab80b72039d8c3c31ccc39b8331b36b12cc41587180251d184a1c33de27c1213270eafb584f43d2bb734eca91054e23fd99be6be28c2eaf9e354b4c1a81f10673092a49d8c7d60a5eac7ac50be55a077ad0fae0364b21fb0ae2737e388c2b8c5b1c19ccfa197aceae3070be8152d763d0b80631733db824953e332743ae3c79c3299cd7edf9c362fd9f48fff53ab162a43196bdad5654a7045068c7ac3ca76efe5ebcd88fecac0ad2bd4406ff2452a5d50340e9b94302ea58918f2de9380eec4e0e249ab86cfe2ecbd87fd126494da7ee53cdb8ed9701aef22994cd875e007bb64f124e19d00cfb56e1f15e9e114b083188f5a7aefd01fb3f71dcc34170203010001'
	];

	port;
	hid_pub;
	hid_prv;
	hpht;
	hbuy;
	hksrv;
	node;
    trans;
	keepalive;
	keepalive_interval_handle;
	geocoding;
	is_keyserver_validator;

	// Currently we can only create one kind of Happ instance - it implements a single UDP transport module, full STUN services,
	// a DHT peer with a node id equal to the hash of its public key, and and a PHT interface (indexing on GEO_INDEX_ATTR)
	// TODO: Parameterize this to create different kinds of Happ instances
	constructor({hid_pub = null, hid_prv = null, port = 27500, keepalive = true, geocoding = Happ.GEOCODING_METHOD.NOMINATIM, is_keyserver_validator = false} = {}) {
		// Give JavaScript's built-in Map type a serializer and a deserializer
		Object.defineProperty(global.Map.prototype, "toJSON", {
			value: Hutil._map_to_json
		});

		Object.defineProperty(global.Map, "from_json", {
			value: Hutil._map_from_json
		});

		this.hid_pub = hid_pub;
		this.hid_prv = hid_prv;
		this.port = port;
		this.hpht = null;
		this.hbuy = null;
		this.node = null;
		this.trans = null;
        this.keepalive = keepalive;
		this.keepalive_interval_handle = null;
		this.geocoding = geocoding;
		this.is_keyserver_validator = is_keyserver_validator;
	}

	// Convenience method to generate a public/private key pair
	static generate_key_pair(passphrase) {
		return Hid.generate_key_pair(passphrase);
	}

	// Convenience method to cryptographically sign some data
	static sign(data, key, passphrase) {
		return Hid.sign(data, key, passphrase);
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
		if (Happ_env.ENV === Happ_env.ENV_TYPE.BROWSER) {
			// TODO: write the browser implementation using XMLHttpRequest
			throw new Error("No browser implementation for HTTPS requests yet!"); 
		}

		const query = new URLSearchParams({
			"street": street,
			"city": city,
			"state": state,
			"postalcode": postalcode,
			"format": "json"
		});

		const path = `/search?${query.toString()}`;
		const headers = {"User-Agent": Happ.USER_AGENT};
		
		if (Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE) {
			return fetch(`https://${hostname}${path}`, {
				method: "GET",
				headers: headers
			}).then((res) => res.json()).then((data) => {
				const parsed = data[0];
				return new Hgeo_coord({lat: parseFloat(parsed.lat), long: parseFloat(parsed.lon)});
			}).catch((err) => {
				// TODO: handle error!
			});
		}

		if (Happ_env.ENV === Happ_env.ENV_TYPE.NODE) {
			const opt = {
				hostname: hostname,
				headers: headers,
				path: path,
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
		// TODO: we shouldn't need to know how to instantiate a compatible
		// Hdlt instance - we should move Hdlt construction to the Hksrv
		// constructor, just passing consensus mechanism and app ID
		const ksrv_dlt = new Hdlt({
			net: new Hdlt_net_solo(happ_udp_trans, Happ.KEYSERVER_APP_ID),
			hkad: peer_node,
			hid_pub: this.hid_pub,
			hid_prv: this.hid_prv,
			consensus: Hdlt.CONSENSUS_METHOD.AUTH, 
			is_validator: this.is_keyserver_validator,
			args: {auth: Happ.AUTHORITIES, rate: Happ.KEYSERVER_BLOCK_RATE, t_handle: null},
			tx_valid_hook: Hksrv.TX_VALID_HOOK,
			db_hook: Hksrv.UTXO_DB_HOOK,
			db_init_hook: Hksrv.UTXO_DB_INIT_HOOK
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
