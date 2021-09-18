/** 
* FAPP 
* Public API
*
*
*
*
*/ 

"use strict";

const { Fapp_cfg } = require("./fapp_cfg.js");
const cfg = require("../../libfood.json");
const https = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE ? require("https") : null;
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Fapp_bboard } = require("./fapp_bboard.js");
const { Ftrans_rinfo } = require("../ftrans/ftrans_rinfo.js");
const { Ftrans_udp } = require("../ftrans/trans/udp/ftrans_udp.js");
const { Fkad_node } = require("../fkad/fkad_node.js");
const { Fkad_node_info } = require("../fkad/fkad_node_info.js");
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
  static GEO_INDEX_ATTR = "ffm41nl1n3";
  static KEYSERVER_APP_ID = "k";
  static KEYSERVER_BLOCK_RATE = [10000, 20000];
  static SEARCH_DIST_MILES = 2.0;
  static T_IDLE = 10 * 60 * 1000;
 
  static GEOCODING_METHOD = {
    NOMINATIM: 0
  };

  static GEOCODING_HOSTS = new Map([
    [Fapp.GEOCODING_METHOD.NOMINATIM, ["nominatim.openstreetmap.org"]]
  ]);

  static GEOCODING_HANDLER = new Map([
    [Fapp.GEOCODING_METHOD.NOMINATIM, Fapp._geocoding_handler_nominatim]
  ]);

  port;
  fid_pub;
  fid_prv;
  bootstrap_nodes;
  authorities;
  trusted_root_keys;
  fpht;
  fbuy;
  fstun;
  fksrv;
  node;
  trans;
  keepalive;
  t_keepalive;
  keepalive_max_tries;
  keepalive_interval;
  anti_idle_interval;
  crud_ops;
  geocoding;
  is_keyserver_validator;

  /**
   * To create a new Fapp instance, the important things here are fid_pub and fid_prv (for the peer
   * who'll be joining the network) and bootstrap_nodes/authorities/trusted_root_keys, which should
   * come from your network secrets file. TODO: currently we only allow Fapp instances with a UDP
   * transport, but this should eventually be parameterizable...
   */ 
  constructor({
    fid_pub = null, 
    fid_prv = null, 
    port = 27500,
    bootstrap_nodes = [],
    authorities = [],
    trusted_root_keys = [],
    geocoding = Fapp.GEOCODING_METHOD.NOMINATIM, 
    is_keyserver_validator = false,
    keepalive = true,
    t_keepalive = 20000,
    keepalive_max_tries = 3
  } = {}) {
    this.bootstrap_nodes = bootstrap_nodes.map((tuple) => {
      const [address, port, pubkey] = tuple;
      return new Ftrans_rinfo({address: address, port: port, pubkey: pubkey});
    });

    this.authorities = [...authorities];
    this.trusted_root_keys = [...trusted_root_keys];
    this.fid_pub = fid_pub;
    this.fid_prv = fid_prv;
    this.port = port;
    this.fpht = null;
    this.fbuy = null;
    this.node = null;
    this.trans = new Ftrans_udp({port: this.port, pubkey: this.fid_pub.pubkey});
    this.fstun = new Fstun({net: new Fstun_net_solo(this.trans)});
    this.keepalive = keepalive;
    this.t_keepalive = t_keepalive;
    this.keepalive_interval = null;
    this.anti_idle_interval = null;
    this.crud_ops = Promise.resolve();
    this.geocoding = geocoding;
    this.is_keyserver_validator = is_keyserver_validator;
  }

  /**
   * Convenience method to generate a public/private key pair
   */ 
  static async generate_key_pair(passphrase) {
    return await Fcrypto.generate_key_pair(passphrase);
  }

  /**
   * Convenience method to generate a cryptographic signature over data 'data'
   */ 
  static async sign(data, key) {
    return await Fcrypto.sign(data, key);
  }

  /**
   * Convenience method to verify a cryptographic signature 'sig' over 'data'
   */ 
  static async verify(data, key, sig) {
    return await Fcrypto.verify(data, key, sig);
  }
    
  /**
   * Compute the peer ID derived from input 'data'. Free Food requires peer IDs to be equal to the 
   * hash of its public key computed in this fashion
   */ 
  static get_peer_id(data) {
    return new Fbigint(Fcrypto.sha1(data));
  }

  /**
   * Derive a lat/long pair from a street address using the specified geocoding method
   */ 
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

    throw new Error(`All hosts for geocoding method ${Object.keys(Fapp.GEOCODING_METHOD)[method]}` + 
      ` failed!`);
  }

  static _geocoding_handler_nominatim({hostname, street, city, state, postalcode} = {}) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.BROWSER) {
      /**
       * TODO: write the browser implementation using XMLHttpRequest
       */ 
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
    
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      return fetch(`https://${hostname}${path}`, {
        method: "GET",
        headers: headers
      }).then((res) => res.json()).then((data) => {
        const parsed = data[0];
        return new Fgeo_coord({lat: parseFloat(parsed.lat), long: parseFloat(parsed.lon)});
      }).catch((err) => {
        /**
         * TODO: handle error
         */ 
      });
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
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

  async _keepalive_handler(n = 1) {
    const recip = this.bootstrap_nodes[Math.floor(Math.random() * this.bootstrap_nodes.length)];

    try {
      await this.send_keepalive(recip);
      Flog.log(`[FAPP] Keepalive OK`);
    } catch(err) {
      if (n < this.keepalive_max_tries) {
        this._keepalive_handler(n + 1);
      }
    }
  }

  /**
   * Send a keepalive message to a peer. TODO: to keep track of msg state, we use an FKAD ping RPC, 
   * but we should be more lightweight than this...
   */ 
  send_keepalive(ftrans_rinfo) {
    return new Promise((resolve, reject) => {
      const node_info = new Fkad_node_info({
        addr: ftrans_rinfo.address,
        port: ftrans_rinfo.port,
        node_id: new Fbigint(Fcrypto.sha1(ftrans_rinfo.pubkey)),
        pubkey: ftrans_rinfo.pubkey
      });

      this.node._req_ping(node_info, resolve, reject);
    });
  }

  /**
   * Convenience method: send a transaction req to the peer named on 'cred' and listen once for 
   * Fbuy_status.CODE.CONFIRMED, calling status_cb if we hear it. Immediately returns the 
   * transaction ID as a string.
   */ 
  send_transaction({cred, order, pment, success = () => {}, timeout = () => {}, status_cb} = {}) {
    /**
     * TODO: Do security checks on the cred. Also, this should be parameterized to allow us to send
     * transactions from different delivery addresses
     */ 

    const transaction = new Fbuy_tsact({
        order: order,
        pment: pment,
        from: this.fid_pub,
        id: Fbigint.unsafe_random(Fbuy_tsact.ID_LEN).toString(16)
    });

    /**
     * Set up the status listener before sending the transaction to avoid a race condition. TODO: we 
     * never cancel this this listener, we should cancel if the tsact req times out or errs
     */ 
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
      // TODO: Handle error
      timeout();
    });

    return transaction.id;
  }

  /**
   * Convenience method: send an SMS to the peer associated with pubkey 'pubkey'. Immediately 
   * returns the constructed Fbuy_sms object.
   */ 
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
      // TODO: Handle error
      timeout();
    });

    return sms;
  }

  /**
   * Convenience method: send a status message to the peer associated with pubkey 'pubkey'.
   * Immediately returns the Fbuy_status object.
   */ 
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

  /**
   * Convenience method wrapping Fbuy.on_status(): subscribe only once to the next status event for 
   * a given transaction ID and status code
   */ 
  on_status({transact_id, status_code, cb} = {}) {
    this.fbuy.on_status(transact_id, status_code, cb);
  }

  /**
   * Convenience method wrapping Fbuy.on_sms(): set the handler function for inbound sms messages
   */ 
  on_sms({f} = {}) {
    this.fbuy.on_sms(f);
  }

  /**
   * Convenience method: fetch the object representing our controlled folksonomy of menu keywords
   */ 
  get_menu_keywords() {
      return Fbuy_menu.KEYWORDS;
  }

  /**
   * Convenience method: fetch the object representing our fulfillment types
   */ 
  get_ffment_types() {
    return Fbuy_ffment.TYPE;
  }

  /**
   * Convenience method to create an Fbuy_item_ref
   */ 
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

  /**
   * Convenience method to create an Fbuy_item_misc
   */ 
  create_item_misc({desc, price, qty} = {}) {
    return new Fbuy_item_misc({
      desc: desc,
      price: price,
      qty: qty
    });
  }

  /**
   * Convenience method to compute the form ID for an Fbuy_menu 
   */ 
  get_form_id(fbuy_form) {
    return Fbuy_menu.get_form_id(fbuy_form);
  }

  /**
   * Return a reference to our FKAD node
   */ 
  get_node() {
    return this.node;
  }

  /**
   * Return a reference to our latitude/longitude as an Fgeo_coord
   */ 
  get_location() {
    return new Fgeo_coord({lat: this.fid_pub.lat, long: this.fid_pub.long});
  }

  /**
   * Search the network for a peer's contact info. Pass 'node_id' as Fbigint. Returns an 
   * Fkad_node_info or null if the contact info cannot be found
   */
  async search_node_info(node_id) {
    const data = await this.node._node_lookup(node_id);

    if (data.payload[0].node_id.equals(node_id)) {
      return data.payload[0];
    }

    return null;
  }

  /**
   * High level method to start serving a resource; form is a food menu or similar. To start service
   * means that we will periodically update our status to avoid going idle; this function 
   * idempotently kicks off that process.
   * 
   * What's this idle system all about? Well, on the Free Food network, we need to solve for two
   * concerns: One, we want to have a high resolution idea of when a restaurant was last active,
   * such that we can avoid surfacing restaurants which seem to have disappeared due to connection
   * issues or whatever. And two, we need to have some way to delete old restaurant info completely
   * from the PHT, such that we can prevent the trie from growing unboundedly.
   * 
   * While solving for these concerns, we want to update the topology of the trie as infrequently 
   * as we can, because topological updates (merge/split operations) are very expensive.
   * 
   * We arrive at this idea: Restaurants must overwrite their contact info on some high frequency 
   * interval (~10 min) to touch their last_active time. Overwriting guarantees a lightweight update
   * with no split. Restaurant info "expires" on a much lower frequency interval (24 - 72 hours),
   * at which point it will be deleted from the trie, perhaps resulting in a merge. TODO: write 
   * garbage collection to do this!
   * 
   * The intended outcome: A new restaurant, upon signing up for Free Food, performs one heavyweight
   * insertion operation which may result in a split. Their contact info remains in medium-term
   * storage on the trie; during business hours, they periodically stomp their last_active time
   * to surface themselves to diners. Assuming the restaurant logs in every day day or so, they 
   * will never perform another heavyweight insertion. Should a restaurant go MIA for a few days,
   * we wipe their contact info and merge down the trie. They will simply re-insert it if they reappear. 
   */ 
  async start_service(form) {
    await this._touch(form);
    
    if (this.anti_idle_interval === null) {
      this.anti_idle_interval = setInterval(async () => {
        Flog.log(`[FAPP] Running anti-idle...`);
        await this._touch(form);
      }, Math.floor(Fapp.T_IDLE / 2));
    }
  }

  /**
   * Stop serving a resource and go idle immediately
   */ 
  async stop_service() {
    clearTimeout(this.anti_idle_interval);
    this.anti_idle_interval = null;
    await this._touch(null, -1);
  }

  async _touch(form, last_active) {
    const privkey = await Fcrypto.get_privkey();

    const bboard = await Fapp_bboard.sign(new Fapp_bboard({
      cred: this.fid_pub,
      form: form ? form.freeze() : null,
      last_active: last_active
    }), privkey.toString("hex"));

    await this.put(bboard);
  }

  /**
   * Here at the public API layer, we serialize PHT updates using Promise chaining. In other words: 
   * use Fapp.put() and Fapp.delete() to do your CRUD operations and you don't have to worry about 
   * accidental concurrency. TODO: there's prob a nice memory leak in here somewhere
   */ 

  /**
   * Publish a Fapp_bboard to the network under our location key. This is a lower level 
   * function; to start serving a resource, use start_service() above
   */ 
  async put(bboard) {
    this.crud_ops = this.crud_ops.then(async () => {
      await this.fpht.insert(this.get_location().linearize(), bboard);
    });

    await this.crud_ops;
  }

  /**
   * Delete any data on the network that's associated with our location key
   */ 
  async delete() {
    this.crud_ops = this.crud_ops.then(async () => {
      await this.fpht.delete(this.get_location().linearize());
    });

    await this.crud_ops;
  }

  /**
   * High level method to retrieve a list of nearby resource providers. If you're a resource 
   * consumer, this is probably what you want to use to populate your resource list...
   */ 
  async get_local_resources() {
    const loc = this.get_location();
    const search_window = Fgeo.get_exts(loc, Fapp.SEARCH_DIST_MILES);
    const res = await this.geosearch(search_window);
    const t_expiry = Date.now() - Fapp.T_IDLE;
    
    const active = res.filter((res) => {
      const [key, bboard] = res;
      return bboard.last_active > t_expiry;
    });
    
    Flog.log(`[FAPP] Searched ${Fapp.SEARCH_DIST_MILES.toFixed(1)} miles from ` + 
      `${loc.lat}, ${loc.long}; resources discovered: ${res.length} (${active.length} active)`);

    return active;
  }

  /**
   * Search the network for data within a geographic window defined by an Fgeo_rect
   * This is a lower level function; for doing a regular search, use get_local_resources() above
   */ 
  async geosearch(rect) {
    return await this.fpht.range_query_2d(rect.get_min().linearize(), rect.get_max().linearize());
  }

  /**
   * Boot this instance and join the network. If we're a bootstrap node, specify a public addr and 
   * port; if we're a regular node, leave them unspecified and we'll first ask a bootstrap node to 
   * resolve our network info using STUN
   */ 
  async start({addr = null, port = null} = {}) {
    /**
     * Boot our transport module and STUN services
     */ 
    await this.trans._start();
    this.fstun.start();
        
    /**
     * If we need to resolve our external address and port, let's do that. TODO: we should randomly
     * shuffle the bootstrap nodes...
     */ 
    if (addr === null || port === null) {
      let res_net_info = null;
      let i = 0;

      while (res_net_info === null && i < this.bootstrap_nodes.length) {
         res_net_info = await this.fstun._binding_req(
          this.bootstrap_nodes[i].address, 
          this.bootstrap_nodes[i].port, 
          this.bootstrap_nodes[i].pubkey
        );

        i += 1;
      }

      if (res_net_info === null) {
        throw new Error("STUN binding request failed!");
      }

      [addr, port] = res_net_info;
    } 

    /**
     * Create a DHT node
     */ 
    this.node = new Fkad_node({
      eng: new Fkad_eng_alpha(), 
      net: new Fkad_net_solo(this.trans), 
      addr: addr,
      port: port,
      pubkey: this.fid_pub.pubkey
    });

    /**
     * Bootstrap onto the network. TODO: should we bootstrap with more than one node? We should also
     * randomly shuffle the bootstrap nodes here
     */  
    let bootstrap_res = false;

    for (let i = 0; i < this.bootstrap_nodes.length && bootstrap_res === false; i += 1) {
      bootstrap_res = await this.node.bootstrap({
        addr: this.bootstrap_nodes[i].address, 
        port: this.bootstrap_nodes[i].port, 
        pubkey: this.bootstrap_nodes[i].pubkey
      });
    }

    if (!bootstrap_res) {
      throw new Error("DHT bootstrap failed!");
    }

    if (this.keepalive) {
      this.keepalive_interval = setInterval(this._keepalive_handler.bind(this), this.t_keepalive);
      Flog.log(`[FAPP] keepalive enabled (${this.t_keepalive / 1000}s)`);
    }

    /**
     * Create a PHT interface
     */ 
    this.fpht = new Fpht({
      index_attr: Fapp.GEO_INDEX_ATTR,
      dht_lookup_func: this.node._node_lookup, 
      dht_lookup_args: [this.node._req_find_value], 
      dht_node: this.node,
      dht_ttl: Fkad_node.T_DATA_TTL
    });

    /**
     * Idempotently initialize the PHT topology
     */ 
    await this.fpht.init();

    /**
     * Create and boot the default FKSRV interface. TODO: we shouldn't need to know how to 
     * instantiate a compatible Fdlt instance - we should move Fdlt construction to the Fksrv
     * constructor, just passing consensus mechanism and app ID
     */ 
    const ksrv_dlt = new Fdlt({
      net: new Fdlt_net_solo(this.trans, Fapp.KEYSERVER_APP_ID),
      fkad: this.node,
      fid_pub: this.fid_pub,
      consensus: Fdlt.CONSENSUS_METHOD.AUTH, 
      is_validator: this.is_keyserver_validator,
      args: {auth: this.authorities, rate: Fapp.KEYSERVER_BLOCK_RATE, t_handle: null},
      tx_valid_hook: Fksrv.TX_VALID_HOOK,
      db_hook: Fksrv.UTXO_DB_HOOK,
      db_init_hook: Fksrv.UTXO_DB_INIT_HOOK
    });

    this.fksrv = new Fksrv({dlt: ksrv_dlt, trusted_root_keys: this.trusted_root_keys});
    this.fksrv.start();

    /**
     * Create and boot an FBUY instance
     */ 
    const fapp_fbuy_net = new Fbuy_net_solo(this.trans);
    this.fbuy = new Fbuy({net: fapp_fbuy_net, fid_pub: this.fid_pub});
    this.fbuy.start();
  }

  /**
   * Disconnect and shut down
   */ 
  async stop() {
    try {
      if (this.trans) {
        await this.trans._stop()
        this.fstun.stop();
        this.fbuy.stop();
        this.fpht = null;
        this.node._stop_intervals();
        this.node = null;
      }

      if (this.keepalive_interval) {
        clearInterval(this.keepalive_interval);
        this.keepalive_interval = null;
      }
    } catch {
      // Do nothing
    }
  }
}

module.exports.Fapp = Fapp;
