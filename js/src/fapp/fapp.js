/** 
* FAPP 
* Public API
*
*
*
*
*/ 

"use strict";

const { Fapp_env } = require("./fapp_env.js");
const https = Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE ? require("https") : null;
const { Fbigint } = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Fapp_bboard } = require("./fapp_bboard.js");
const { Ftrans_rinfo } = require("../ftrans/ftrans_rinfo.js");
const { Ftrans_udp } = require("../ftrans/trans/ftrans_udp.js");
const { Fkad_node } = require("../fkad/fkad_node.js");
const { Fkad_eng_alpha } = require("../fkad/eng/fkad_eng_alpha.js");
const { Fkad_net_solo } = require("../fkad/net/fkad_net_solo.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js");
const { Fgeo } = require("../fgeo/fgeo.js");
const { Fgeo_coord } = require("../fgeo/fgeo_coord.js");
const { Fgeo_rect } = require("../fgeo/fgeo_rect.js");
const { Fpht } = require("../fpht/fpht.js");
const { Fstun } = require("../fstun/fstun.js");
const { Fstun_net_solo } = require("../fstun/net/fstun_net_solo.js");
const { Fdlt } = require("../fdlt/fdlt.js");
const { Fdlt_net_solo } = require("../fdlt/net/fdlt_net_solo.js");
const { Fksrv } = require("../fksrv/fksrv.js"); 
const { Fbuy } = require("../fbuy/fbuy.js");
const { Fbuy_ffment } = require("../fbuy/fbuy_ffment.js");
const { Fbuy_status } = require("../fbuy/fbuy_status.js");
const { Fbuy_sms } = require("../fbuy/fbuy_sms.js");
const { Fbuy_net_solo } = require("../fbuy/net/fbuy_net_solo.js");
const { Fbuy_menu } = require("../fbuy/fbuy_menu.js"); 
const { Fbuy_item_ref } = require("../fbuy/fbuy_item_ref.js");
const { Fbuy_item_misc } = require("../fbuy/fbuy_item_misc.js");
const { Fbuy_tsact } = require("../fbuy/fbuy_tsact.js");
const { Fntree } = require("../ftypes/fntree/fntree.js");
const { Futil } = require("../futil/futil.js"); 
const { Flog } = require("../flog/flog.js");

class Fapp {
  static USER_AGENT = "Free Food (https://freefood.is)";
  static GEO_INDEX_ATTR = "___h34v3n.geoha$h!!";
  static KEYSERVER_APP_ID = "k";
  static KEYSERVER_BLOCK_RATE = [10000, 20000];
  static SEARCH_DIST_MILES = 2.0;
  static T_NAT_KEEPALIVE = 20000;

  static GEOCODING_METHOD = {
    NOMINATIM: 0
  };

  static GEOCODING_HOSTS = new Map([
    [Fapp.GEOCODING_METHOD.NOMINATIM, ["nominatim.openstreetmap.org"]]
  ]);

  static GEOCODING_HANDLER = new Map([
    [Fapp.GEOCODING_METHOD.NOMINATIM, Fapp._geocoding_handler_nominatim]
  ]);

  static BOOTSTRAP_NODES = [
    new Ftrans_rinfo({
      address: "66.228.34.29",
      port: 27500,
      pubkey: 
        "30820122300d06092a864886f70d01010105000382010f003082010a0282010100ae76d" + 
        "bab80b72039d8c3c31ccc39b8331b36b12cc41587180251d184a1c33de27c1213270eaf" + 
        "b584f43d2bb734eca91054e23fd99be6be28c2eaf9e354b4c1a81f10673092a49d8c7d6" + 
        "0a5eac7ac50be55a077ad0fae0364b21fb0ae2737e388c2b8c5b1c19ccfa197aceae307" + 
        "0be8152d763d0b80631733db824953e332743ae3c79c3299cd7edf9c362fd9f48fff53a" + 
        "b162a43196bdad5654a7045068c7ac3ca76efe5ebcd88fecac0ad2bd4406ff2452a5d50" + 
        "340e9b94302ea58918f2de9380eec4e0e249ab86cfe2ecbd87fd126494da7ee53cdb8ed" + 
        "9701aef22994cd875e007bb64f124e19d00cfb56e1f15e9e114b083188f5a7aefd01fb3" + 
        "f71dcc34170203010001"
    })
  ];

  static AUTHORITIES = [
    "30820122300d06092a864886f70d01010105000382010f003082010a0282010100a6108c36296" + 
    "1ff79246467b1b0c8505aac91fde23daa711e297f4601b053acb18c2e90defbaba60bdfee93fb" + 
    "ab3c1d0d0559a50dfb5d0356bee484814a786f7b9e679e6ed822ff77bfc2c4fcc232e418aa5eb" +
    "ddcbbaa27d63939108a3bd91694c0f347fc1038d151306eecd0630719809aa4187c0d1dab1bb1" +
    "32ff0df29cbd5342ed32d51d1db053ecb6eacc7c998a19d3f46534d0d9b70d706ef8f90d75431" + 
    "a8a192f772170b7c97e1f97e651d7ec5ca00a8bf2f5a896e232750f0ecf9007bfdd51550c6a0d" + 
    "a554c79a64dc4164c71885682d75e278c0fc27db1942b4d15d48c9ff9c2aa8f1e9b77d211a4ae" + 
    "8aa56927cf9393dc71121d97eadb52c555bba310203010001",
    
    "30820122300d06092a864886f70d01010105000382010f003082010a0282010100ae76dbab80b" + 
    "72039d8c3c31ccc39b8331b36b12cc41587180251d184a1c33de27c1213270eafb584f43d2bb7" + 
    "34eca91054e23fd99be6be28c2eaf9e354b4c1a81f10673092a49d8c7d60a5eac7ac50be55a07" + 
    "7ad0fae0364b21fb0ae2737e388c2b8c5b1c19ccfa197aceae3070be8152d763d0b80631733db" + 
    "824953e332743ae3c79c3299cd7edf9c362fd9f48fff53ab162a43196bdad5654a7045068c7ac" + 
    "3ca76efe5ebcd88fecac0ad2bd4406ff2452a5d50340e9b94302ea58918f2de9380eec4e0e249" + 
    "ab86cfe2ecbd87fd126494da7ee53cdb8ed9701aef22994cd875e007bb64f124e19d00cfb56e1" +
    "f15e9e114b083188f5a7aefd01fb3f71dcc34170203010001"
  ];

  port;
  fid_pub;
  fid_prv;
  fpht;
  fbuy;
  fksrv;
  node;
  trans;
  keepalive;
  keepalive_interval_handle;
  geocoding;
  is_keyserver_validator;

  // Currently we only support one kind of Fapp instance: it implements a solo UDP transport module,
  // full STUN, a DHT peer with a node ID equal to the hash of its pubkey, and a PHT interface
  // indexing on GEO_INDEX_ATTR - TODO: parameterize this to create diff kinds of Fapp instances
  constructor({
    fid_pub = null, 
    fid_prv = null, 
    port = 27500, 
    keepalive = true, 
    geocoding = Fapp.GEOCODING_METHOD.NOMINATIM, 
    is_keyserver_validator = false
  } = {}) {
    // Give JavaScript's built-in Map type a serializer and a deserializer
    Object.defineProperty(global.Map.prototype, "toJSON", {
      value: Futil._map_to_json
    });

    Object.defineProperty(global.Map, "from_json", {
      value: Futil._map_from_json
    });

    this.fid_pub = fid_pub;
    this.fid_prv = fid_prv;
    this.port = port;
    this.fpht = null;
    this.fbuy = null;
    this.node = null;
    this.trans = null;
    this.keepalive = keepalive;
    this.keepalive_interval_handle = null;
    this.geocoding = geocoding;
    this.is_keyserver_validator = is_keyserver_validator;
  }

  // Convenience method to generate a public/private key pair
  static async generate_key_pair(passphrase) {
    return await Fcrypto.generate_key_pair(passphrase);
  }

  // Convenience method to cryptographically sign some data
  static async sign(data, key) {
    return await Fcrypto.sign(data, key);
  }

  // Convenience method to verify a cryptographic signature
  static async verify(data, key, sig) {
    return await Fcrypto.verify(data, key, sig);
  }
    
  // Compute the peer ID derived from input 'data'
  // Free Food requires peer IDs to be equal to the hash of its public key computed in this fashion
  static get_peer_id(data) {
    return new Fbigint(Futil._sha1(data));
  }

  // Derive a lat/long pair from an address using the specified geocoding method
  static async geocode({street, city, state, postalcode, method} = {}) {
    const hosts = Fapp.GEOCODING_HOSTS.get(method);
    let i = 0;

    while (i < hosts.length) {
      try {
        return await Fapp.GEOCODING_HANDLER.get(method)({
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

    throw new Error(`All hosts for geocoding method ${Object.keys(Fapp.GEOCODING_METHOD)[method]} failed!`);
  }

  static _geocoding_handler_nominatim({hostname, street, city, state, postalcode} = {}) {
    if (Fapp_env.ENV === Fapp_env.ENV_TYPE.BROWSER) {
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
    const headers = {"User-Agent": Fapp.USER_AGENT};
    
    if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
      return fetch(`https://${hostname}${path}`, {
        method: "GET",
        headers: headers
      }).then((res) => res.json()).then((data) => {
        const parsed = data[0];
        return new Fgeo_coord({lat: parseFloat(parsed.lat), long: parseFloat(parsed.lon)});
      }).catch((err) => {
        // TODO: handle error!
      });
    }

    if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
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
              resolve(new Fgeo_coord({lat: parseFloat(parsed.lat), long: parseFloat(parsed.lon)}));
            } catch (err) {
              reject(err);
            }
          });
        });

        req.end();
      });
    }
  }

  // Convenience method: send a transaction req to the peer named on cred and listen once
  // for Fbuy_status.CODE.CONFIRMED, calling status_cb if we hear it
  // Immediately returns the transaction ID as a string independent of success or failure
  send_transaction({cred, order, pment, success = () => {}, timeout = () => {}, status_cb} = {}) {
    // TODO: verify the credential!
    // TODO: How should we handle different physical addresses?

    const transaction = new Fbuy_tsact({
        order: order,
        pment: pment,
        from: this.fid_pub,
        id: Fbigint.unsafe_random(Fbuy_tsact.ID_LEN).toString(16)
    });

    // Set up the status listener before sending the transaction to avoid a race condition 
    // TODO: we never cancel this this listener, we should cancel if the tsact req times out or errs
    this.on_status({
      transact_id: transaction.id, 
      status_code: Fbuy_status.CODE.CONFIRMED, 
      cb: status_cb
    });

    this.search_node_info(Fapp.get_peer_id(cred.pubkey)).then((res) => {
      this.fbuy.transact_req({
          fbuy_transaction: transaction,
            addr: res.addr,
            port: res.port,
            pubkey: res.pubkey,
            success: success,
            timeout: timeout
        });
    }).catch((err) => {
      // TODO: Handle any error
      timeout();
    });

    return transaction.id;
  }

  // Convenience method: send an SMS to the peer associated with pubkey
  // Immediately returns the Fbuy_sms object independent of success or failure
  send_sms({pubkey, text, data, success = () => {}, timeout = () => {}}) {
    const sms = new Fbuy_sms({
      text: text,
      from: this.fid_pub,
      data: data
    });

    this.search_node_info(Fapp.get_peer_id(pubkey)).then((res) => {
      this.fbuy.sms_req({
        fbuy_sms: sms,
        addr: res.addr,
        port: res.port,
        pubkey: res.pubkey,
        success: success,
        timeout: timeout
      });
    }).catch((err) => {
      // TODO: Handle any error
      timeout();
    });

    return sms;
  }

  // Convenience method: send a status message to the peer associated with pubkey
  // Immediately returns the Fbuy_status object
  send_status({pubkey, trans_id, code, success = () => {}, timeout = () => {}}) {
    const status = new Fbuy_status({
      id: trans_id,
      code: code
    });

    this.search_node_info(Fapp.get_peer_id(pubkey)).then((res) => {
      this.fbuy.status_req({
        fbuy_status: status,
        addr: res.addr,
        port: res.port,
        pubkey: res.pubkey,
        success: success,
        timeout: timeout
      });
    }).catch((err) => {
      // TODO: Handle any error
      timeout();
    });

    return status;
  }

  // Convenience methodd which wraps fbuy.on_status: 
  // subscribe only once to the next status event for a given transaction ID and status code
  on_status({transact_id, status_code, cb} = {}) {
    this.fbuy.on_status(transact_id, status_code, cb);
  }

  // Convenience method which wraps fbuy.on_sms: set the handler function for sms messages
  on_sms({f} = {}) {
    this.fbuy.on_sms(f);
  }

  // Convenience method: fetch the object representing our controlled folksonomy of menu keywords
  get_menu_keywords() {
      return Fbuy_menu.KEYWORDS;
  }

  // Convenience method to return the object representing our fulfillment types
  get_ffment_types() {
    return Fbuy_ffment.TYPE;
  }

  // Convenience factory method to create an Fbuy_item_ref
  create_item_ref({
    menu = null, 
    froz_idx = null, 
    size_idx = null, 
    cust_cats_idx = [], 
    qty = 1, 
    comment = null
  } = {}) {
    return new Fbuy_item_ref({
      form_id: this.get_form_id(menu),
      froz_idx: froz_idx,
      size_idx: size_idx,
      cust_cats_idx: cust_cats_idx,
      qty: qty,
      comment: comment
    });
  }

  // Convenience factory method to create an Fbuy_item_misc
  create_item_misc({desc, price, qty} = {}) {
    return new Fbuy_item_misc({
      desc: desc,
      price: price,
      qty: qty
    });
  }

  // Convenience method to compute the form ID for an Fbuy_menu 
  get_form_id(fbuy_form) {
    return Fbuy_menu.get_form_id(fbuy_form);
  }

  // Return a reference to our DHT node
  get_node() {
    return this.node;
  }

  // Return a reference to our latitude/longitude as an Fgeo_coord
  get_location() {
    return new Fgeo_coord({lat: this.fid_pub.lat, long: this.fid_pub.long});
  }

  // Search the network for the Fkad_node_info object for a given node_id as Fbigint
  // Returns null if we can't find it
  async search_node_info(node_id) {
    const data = await this.node._node_lookup(node_id);

    if (data.payload[0].node_id.equals(node_id)) {
      return data.payload[0];
    }

    return null;
  }

  // Publish a Fapp_bboard to the network under our location key
  async put(bboard) {
    await this.fpht.insert(this.get_location().linearize(), bboard);
  }

  // High level method to retrieve a list of nearby restaurant peers
  async get_local_resources() {
    const loc = this.get_location();
    const search_window = Fgeo.get_exts(loc, Fapp.SEARCH_DIST_MILES);
    const res = await this.geosearch(search_window);
    
    Flog.log(`[FAPP] Searched ${Fapp.SEARCH_DIST_MILES.toFixed(1)} miles from ` + 
      `${loc.lat}, ${loc.long};resources discovered: ${res.length}`);
    
    return res;
  }

  // Search the network for data within a geographic window defined by an Fgeo_rect
  // This is a lower level function, for doing a standard search, use get_local_resources above
  async geosearch(rect) {
    return await this.fpht.range_query_2d(rect.get_min().linearize(), rect.get_max().linearize());
  }

  // Boot this instance and join the network
  // To boot as a bootstrap node, pass addr and port
  async start({addr = null, port = null} = {}) {
    // Create and boot a UDP transport module
    const fapp_udp_trans = new Ftrans_udp({port: this.port, pubkey: this.fid_pub.pubkey});
    await fapp_udp_trans._start();
        
    this.trans = fapp_udp_trans;

    // Create and start STUN services
    const fapp_stun_net = new Fstun_net_solo(fapp_udp_trans);
    const fapp_stun_service = new Fstun({net: fapp_stun_net});

    let addr_port = null;

    if (addr !== null && port !== null) {
      addr_port = [addr, port];
    } else {
      // Try all of our known bootstrap nodes' STUN servers to resolve our external addr and port 
      for (let i = 0; i < Fapp.BOOTSTRAP_NODES.length && addr_port === null; i += 1) {
        addr_port = await fapp_stun_service._binding_req(
          Fapp.BOOTSTRAP_NODES[i].address, 
          Fapp.BOOTSTRAP_NODES[i].port, 
          Fapp.BOOTSTRAP_NODES[i].pubkey
        );
      }
    }

    if (addr_port === null) {
      throw new Error("STUN binding request failed!");
    }

    // Create a DHT node
    const peer_node = new Fkad_node({
      eng: new Fkad_eng_alpha(), 
      net: new Fkad_net_solo(fapp_udp_trans), 
      addr: addr_port[0],
      port: addr_port[1],
      pubkey: this.fid_pub.pubkey
    });

    this.node = peer_node;

    // TODO: Should we bootstrap with more than one node? 
    // Bootstrap with every bootstrap node in our list?
    let bootstrap_res = false;

    for (let i = 0; i < Fapp.BOOTSTRAP_NODES.length && bootstrap_res === false; i += 1) {
      bootstrap_res = await peer_node.bootstrap({
        addr: Fapp.BOOTSTRAP_NODES[i].address, 
        port: Fapp.BOOTSTRAP_NODES[i].port, 
        pubkey: Fapp.BOOTSTRAP_NODES[i].pubkey
      });
    }

    if (!bootstrap_res) {
      throw new Error("DHT bootstrap failed!");
    }

    // TODO: Keepalive should send a much smaller msg than this
    if (this.keepalive) {
      this.keepalive_interval_handle = setInterval(async () => {
        let res = null;

        for (let i = 0; i < Fapp.BOOTSTRAP_NODES.length && res === null; i += 1) {
          res = await fapp_stun_service._binding_req(
            Fapp.BOOTSTRAP_NODES[i].address, 
            Fapp.BOOTSTRAP_NODES[i].port, 
            Fapp.BOOTSTRAP_NODES[i].pubkey
          );
        }
      }, Fapp.T_NAT_KEEPALIVE);

      Flog.log(`[FAPP] NAT keepalive enabled (${Fapp.T_NAT_KEEPALIVE / 1000}s)`);
    }

    // Create a PHT interface
    this.fpht = new Fpht({
      index_attr: Fapp.GEO_INDEX_ATTR,
      dht_lookup_func: peer_node._node_lookup, 
      dht_lookup_args: [peer_node._req_find_value], 
      dht_node: peer_node,
      dht_ttl: Fkad_node.T_DATA_TTL
    });

    // Idempotently initialize the PHT
    await this.fpht.init();

    // Create and start the default FKSRV interface
    // TODO: we shouldn't need to know how to instantiate a compatible
    // Fdlt instance - we should move Fdlt construction to the Fksrv
    // constructor, just passing consensus mechanism and app ID
    const ksrv_dlt = new Fdlt({
      net: new Fdlt_net_solo(fapp_udp_trans, Fapp.KEYSERVER_APP_ID),
      fkad: peer_node,
      fid_pub: this.fid_pub,
      consensus: Fdlt.CONSENSUS_METHOD.AUTH, 
      is_validator: this.is_keyserver_validator,
      args: {auth: Fapp.AUTHORITIES, rate: Fapp.KEYSERVER_BLOCK_RATE, t_handle: null},
      tx_valid_hook: Fksrv.TX_VALID_HOOK,
      db_hook: Fksrv.UTXO_DB_HOOK,
      db_init_hook: Fksrv.UTXO_DB_INIT_HOOK
    });

    this.fksrv = new Fksrv({dlt: ksrv_dlt});
    this.fksrv.start();

    // Create and start an FBUY interface
    const fapp_fbuy_net = new Fbuy_net_solo(fapp_udp_trans);
    this.fbuy = new Fbuy({net: fapp_fbuy_net, fid_pub: this.fid_pub});
    this.fbuy.start();
  }

  // Disconnect from the network
  async stop() {
    try {
      if (this.trans) {
        this.trans._stop()
        this.fpht = null;
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
}

module.exports.Fapp = Fapp;
