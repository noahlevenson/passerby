"use strict";

const { to_hex, generic_hash }= require("../core/crypto.js");
const Journal = require("../core/journal.js");
const { Bigboy } = require("../core/types/bigboy.js");
const { Bintree, Bintree_node } = require("../core/types/bintree.js");
const Codec = require("../protocol/codec.js");
const { Public_key } = require("../protocol/identity.js");
const { Io } = require("../protocol/io.js");
const { Rinfo } = require("../transport/transport.js");
const { RPC, MSG_TYPE, DATA_TYPE, message, data } = require("./message.js");
const { node_info, compare_info } = require("./node_info.js");
const { Kbucket, Record } = require("./kbucket.js");
const { Store } = require("./store.js");

/**
 * T_KBUCKET_REFRESH: How frequently to force a refresh on stale k-buckets? (default is 1 hour, 
 * but very frequent refreshes help with churn in small networks)
 * T_DATA_TTL: How long does data live before expiring?
 * T_REPUBLISH: How often do we republish all of our originally published data?
 * T_REPLICATE: How often do we republish our partition of the keyspace?
 */ 

class Kademlia extends Io {
  static TAG = "KDHT";
  static DHT_BIT_WIDTH = 256;
  static ID_LEN = Kademlia.DHT_BIT_WIDTH / 8;
  static K_SIZE = 20;
  static ALPHA = 3;
  static T_KBUCKET_REFRESH = 1000 * 5;
  static T_DATA_TTL = 1000 * 60 * 60 * 25;
  static T_REPUBLISH = 1000 * 60 * 60 * 24;
  static T_REPLICATE = 1000 * 60 * 60;

  RPC_HANDLER = new Map([
    [RPC.PING, this._res_ping],
    [RPC.STORE, this._res_store],
    [RPC.FIND_NODE, this._res_find_node],
    [RPC.FIND_VALUE, this._res_find_value]
  ]);

  /**
   * addr and port must be your public network info
   */ 
  constructor(bus, generator, addr, port, public_key) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.DHT});
    this.refresh_interval_handle = null;
    this.republish_interval_handle = null;
    this.node_id = Bigboy.from_hex_str({
      len: Kademlia.ID_LEN, str: to_hex(generic_hash(Kademlia.ID_LEN, public_key.key))
    });
    this.node_info = node_info({addr: addr, port: port, node_id: this.node_id});
    this.data = new Store();
    this.published = new Map();
    this.routing_table = new Bintree(
      new Bintree_node({data: new Kbucket({max_size: Kademlia.K_SIZE, prefix: ""})})
    );
  }

  /**
   * Get XOR "distance" between two Bigboys
   */ 
  static get_distance(key1, key2) {
    return key1.xor(key2);
  }

  /**
   * Bootstrap onto a network. Supply the address, port, and public key of a bootstrap node.
   */ 
  async bootstrap({addr, port, public_key} = {}) {
    const bootstrap_node_info = node_info({
      addr: addr,
      port: port,
      node_id: Bigboy.from_hex_str({
        len: Kademlia.ID_LEN, str: to_hex(generic_hash(Kademlia.ID_LEN, public_key.key))
      })
    });

    /**
     * This PING RPC is how we insert ourselves into the routing table of the bootstrap node. Since
     * peers determine whether to replicate their stored data to new peers at routing table insertion
     * time, this ping can result in a ton of large STORE RPCs which arrive before the pong. Our UDP
     * network controller implements message prioritization which ensures an orderly bootstrap 
     * procedure by processing the pong before getting to work processing the big chunks of data, but
     * if you're reading this from some strange future where we're using a non-UDP transport, beware!
     */ 
    const ping_res = await new Promise((resolve, reject) => {
      this._req_ping(
        bootstrap_node_info,
        (gen, body) => resolve(body.from),
        () => resolve(null),
      );
    });

    if (ping_res === null) {
      const fail_msg = `No PONG from bootstrap node ${addr}:${port}`;
      Journal.log(Kademlia.TAG, fail_msg);
      throw new Error(fail_msg);
    }

    Journal.log(Kademlia.TAG, `Joining network as ${this.node_id.to_base64_str()} ` + 
      `via bootstrap node ${addr}:${port}...`);

    const bucket = this.find_kbucket_for_id(ping_res.node_id).get_data();

    bucket.enqueue(new Record({node_info: ping_res}));

    let last_active = 0;
    let last_inactive = 0;

    // Do a node lookup on myself, refresh every k-bucket further away from my closest neighbor
    const lookup_res = await this.node_lookup(
      this.node_id, 
      this._req_find_node, 
      (n_active, n_inactive) => {
        if (n_active !== last_active || n_inactive !== last_inactive) {
          Journal.log(Kademlia.TAG, `Node lookup: found ${n_active} peers, ${n_inactive} to query`);
        }

        last_active = n_active;
        last_inactive = n_inactive;
      }
    );

    const closest_nodes = lookup_res.payload.filter(node_info => !node_info.node_id.equals(this.node_id));
    const our_bucket = this.find_kbucket_for_id(this.node_id).get_data();

    for (let i = 1; i < closest_nodes.length; i += 1) {
      const bucket = this.find_kbucket_for_id(closest_nodes[i].node_id).get_data();

      if (bucket !== our_bucket) {
        this.refresh_kbucket(bucket);
      }
    }

    const npeers = this.get_nodes_closest_to({
      key: this.node_id, 
      max: Number.POSITIVE_INFINITY
    }).length;

    Journal.log(Kademlia.TAG, `Success: node ${this.node_id.to_base64_str()} is online! ` + 
      `(Discovered ${npeers} peers)`);

    this.init_intervals();
  }

  stop() {
    this.stop_intervals();
    Journal.log(Kademlia.TAG, `Offline`);
  }

  /**
   * Put data to the distributed database; that is, issue a STORE RPC for some key/value pair to
   * the K_SIZE closest peers who own that partition of the keyspace. Returns the number of peers
   * that successfully stored the data.
   */
  async put(key, val) {
    const result = await this.node_lookup(key);
    const kclosest = result.payload;
    const p = [];
    let succ = 0;

    kclosest.forEach((node_info) => {
      p.push(new Promise((resolve, reject) => {
        this._req_store(key, val, node_info, (gen, body) => {
          succ += 1;
          resolve();
        }, () => {
          resolve();
        });
      }));
    });

    await Promise.all(p);
    return succ;
  }

  /** Publish data to the distributed database. When we publish data, we will thereafter consider
   * ourselves the original publisher of that data, and we will accordingly maintain a record of
   * that data; this may have implications wrt our regular republication strategy. Notable here:
   * the Kademlia spec calls for publishers to re-publish their original data every 24 hours, but
   * this would clearly create problems when used with a PHT. Since all of our data objects are 
   * PHT nodes, and each PHT node on the network is subject to change (how many keys does it
   * currently hold? Is it currently a leaf node or an internal node? Has it since been deleted from
   * the topology entirely as a result of a merge operation?), republishing our original data will
   * typically result in stomping a PHT node somewhere on the DHT with a stale version of itself.
   * For our application, it's likely that publish() should be avoided in favor of put(), and 
   * republication logic should be deferred to the PHT layer.
   */
  async publish(key, val) {
    this.published.set(key.to_hex_str(), val);
    await this.put(key, val);
  }

  /**
   * Fetch data 'key' from the distributed database
   */ 
  async get(key) {
    return await this.node_lookup(key, this._req_find_value);
  }

  /**
   * Perform a refresh on a given k-bucket. Per the Kademlia spec, we're supposed to select a 
   * "random ID in the bucket's range." Currently we do this by selecting a random node in the bucket. 
   * TODO: it's prob more rigorous to generate a random ID over the interval of the bucket's range...
   */ 
  async refresh_kbucket(kbucket) {
    const random_id = kbucket.get(Math.floor(Math.random() * kbucket.length())).node_info.node_id;
    const prefix = kbucket.get_prefix();
    Journal.log(Kademlia.TAG, `Refreshing k-bucket ${prefix.length === 0 ? "[root]" : prefix} ` + 
      `(${kbucket.length()} contact${kbucket.length() > 1 ? "s" : ""})`);
    await this.node_lookup(random_id);
  }

  /**
   * Find the appropriate leaf node in the routing table for a given node ID (as Bigboy)
   */ 
  find_kbucket_for_id(id) {
    let node = this.routing_table.get_root();
    let i = 0;

    while (node.get_left() !== null && node.get_right() !== null) {
      node = node.get_child_bin(id.get_bit(i));
      i += 1;
    }

    return node;
  }

  /**
   * Implements the data replication logic which applies to newly discovered peers: For each data
   * object we're responsible for, if the new node is one of the K closest nodes to the key AND we
   * are closer to the key than any of our neighbors (or if the new node is now closer to the key
   * than we are), then replicate it to the new node. Calls to _replicate() are likely to be quite
   * long-lived operations, as we serialize a lot of STORE RPCs to a newly discovered peer; 
   * accordingly, we work with the live state of the datastore throughout the process such that any
   * concurrent data updates we receive will be reflected in the data we replicate out.
   */ 
  async _replicate(node_info) {
    for (const key_str of this.data.keys()) {
      const key = Bigboy.from_hex_str({len: Kademlia.ID_LEN, str:key_str});
      const cnodes = this.get_nodes_closest_to({key: key});

      const is_node_k_closest = cnodes.some(cnode => compare_info(cnode, node_info));
      const is_self_closer = Kademlia.get_distance(this.node_id, key).less_equal(
        Kademlia.get_distance(cnodes[0].node_id, key));
      const is_node_closer = compare_info(cnodes[0], node_info);

      if (is_node_k_closest && (is_self_closer || is_node_closer)) {
        Journal.log(Kademlia.TAG, `Replicating ${key.to_base64_str()} to new node ` +
        `${node_info.node_id.to_base64_str()}`);

        const val = this.data.get(key);

        /**
         * Just in case we have a lot of data to replicate to this new node, we serialize our STORE
         * RPCs instead of rudely blasting them all out at once...
         */ 
        await new Promise((resolve, reject) => {
          this._req_store(key, val.get_data(), node_info, (gen, body) => {
            resolve();
          }, () => {
            resolve();
          });
        });
      }
    }
  }

  /**
   * TODO: this god function is not chad mode
   * We need to separate our concerns and break this up. These are the activities being performed
   * here: deciding if a contact needs to be inserted, handling the easy insertion case, handling
   * the hard insertion case which requires bucket splitting, and replicating data to new contacts.
   */ 
  routing_table_insert(inbound_node_info) {
    let leaf_node = this.find_kbucket_for_id(inbound_node_info.node_id);
    let bucket = leaf_node.get_data();
    const kbucket_rec = bucket.exists(inbound_node_info);

    /**
     * TODO: a locked contact is silently unlocked before insertion by wrapping it in a fresh 
     * Record; it's bad for code comprehension bc the locking occurs in Fkad_eng_alpha
     */ 
    const new_kbucket_rec = new Record({node_info: inbound_node_info});

    if (kbucket_rec !== null) {
      /**
       * CASE 1: We've already seen this node in this bucket, so just move a fresh record to the tail
       */ 
      bucket.delete(kbucket_rec);
      bucket.enqueue(new_kbucket_rec);
    } else if (kbucket_rec === null && !bucket.is_full()) {
      /**
       * CASE 2: We've never seen this node and the appropriate bucket isn't full, so just insert it
       */ 
      bucket.enqueue(new_kbucket_rec);
      this._replicate(inbound_node_info);
    } else {
      /**
       * CASE 3: We've never seen this node but the appropriate bucket is full
       */ 
      const our_bucket = this.find_kbucket_for_id(this.node_id).get_data();

      if (bucket === our_bucket) {
        /**
         * 3A: The incoming node_info's bucket's range includes our ID, so split the bucket
         */ 
        const left_child = new Bintree_node({
          parent: leaf_node, 
          data: new Kbucket({max_size: Kademlia.K_SIZE, prefix: `${bucket.get_prefix()}0`})
        });

        const right_child = new Bintree_node({
          parent: leaf_node,
          data: new Kbucket({max_size: Kademlia.K_SIZE, prefix: `${bucket.get_prefix()}1`})
        });

        leaf_node.set_left(left_child);
        leaf_node.set_right(right_child);
        leaf_node.set_data(null);

        /**
         * Redistribute the Records from the old bucket to the new leaves
         */ 
        bucket.to_array().forEach((kbucket_rec) => {
          const b = kbucket_rec.node_info.node_id.get_bit(bucket.get_prefix().length);
          leaf_node.get_child_bin(b).get_data().enqueue(kbucket_rec);
        });

        /**
         * Attempt reinsertion via recursion
         */ 
        this.routing_table_insert(inbound_node_info);
      } else {
        /**
         * 3B: The incoming node_info's bucket's range does not include our ID. Per the spec,
         * section 4.1, the optimized way to handle this is to add the new contact to the 
         * "replacement cache" and do a lazy replacement -- i.e., swap in a peer from the 
         * replacement cache the next time we mark a peer in this bucket range as stale. 
         * 
         * TODO: this case requires an implementation!
         * 
         * TODO: remember that, when lazy replacing a peer, you probably need to perform the 
         * replication check in CASE 2. Why? Well, at the time a peer was placed in the replacement
         * cache, we do know that since their bucket range doesn't include our ID, they are not
         * one of the K closest peers responsible for values in our partition of the keyspace. But
         * the routing table will have changed by the time we get around to lazy replacing them...
         */
      }
    }
  }

  /**
   * BST comparator function for insertion of a node_info: sort the BST by both XOR distance 
   * from 'key' and lexicographical distance of the node_info's concatenated addr and port. 
   * This keeps the BST sorted by the Kademlia distance metric while also handling data elements 
   * which share the same key but have different network info due to churn...
   */ 
  _insert_by_xor_lex(key, node, oldnode) {
    if (Kademlia.get_distance(key, node.get_data().node_id).less(
      Kademlia.get_distance(key, oldnode.get_data().node_id))) {
      return -1;
    } else if (Kademlia.get_distance(key, node.get_data().node_id).greater(
      Kademlia.get_distance(key, oldnode.get_data().node_id))) {
      return 1;
    }

    const node_net_info = `${node.get_data().addr}${node.get_data().port}`;
    const oldnode_net_info = `${oldnode.get_data().addr}${oldnode.get_data().port}`;
    return node_net_info.localeCompare(oldnode_net_info);
  }

  /**
   * BST comparator function to search over a tree of node_infos: assumes the tree is sorted 
   * using _insert_by_xor_lex(), where the XOR distance is measured from 'key'. Note the subtle
   * difference between this function and _insert_by_xor_lex(): BST insertion comparators work with 
   * BST nodes, while BST search comparators work with BST values.
   */ 
  _search_by_xor_lex(key, node_info_a, node) {
    const node_info_b = node.get_data();

    if (Kademlia.get_distance(key, node_info_a.node_id).less(
      Kademlia.get_distance(key, node_info_b.node_id))) {
      return -1;
    } else if (Kademlia.get_distance(key, node_info_a.node_id).greater(
      Kademlia.get_distance(key, node_info_b.node_id))) {
      return 1;
    }

    const node_a_net_info = `${node_info_a.addr}${node_info_a.port}`;
    const node_b_net_info = `${node_info_b.addr}${node_info_b.port}`;
    return node_a_net_info.localeCompare(node_b_net_info);
  }

  /**
   * Perform one round of a node lookup for 'key', sending RPC 'rpc' to 'rsz' peers, given some 
   * state of active nodes and inactive nodes (as BSTs). 
   * 
   * If a value is found, we'll return a pair in the form of [payload, closest], where 'payload' is 
   * the data.payload wrapping the value, and 'closest' is the BST node wrapping the 
   * closest active peer we heard of who didn't have the value. In many cases, 'closest' will be 
   * null, indicating that we didn't know of any other active peers at the time we found the value. 
   * 
   * If a value is not found, we return undefined.
   */ 
  async _do_node_lookup({active, inactive, rsz = Kademlia.ALPHA, rpc, key} = {}) {
    const contacts = [];
    let node = inactive.bst_min();

    while (node !== null && contacts.length < rsz) {
      contacts.push(node);
      node = inactive.bst_successor(node);
    }

    const results = [];
    
    contacts.forEach((node) => {
      results.push(new Promise((resolve, reject) => {
        rpc.bind(this)(key, node.get_data(), (gen, body) => {
          if (body.data.type === DATA_TYPE.VAL) {
            resolve([body.data.payload, active.bst_min()]);
            return;
          } 

          active.bst_insert(
            new Bintree_node({data: body.from}), 
            this._insert_by_xor_lex.bind(this, key)
          );
          
          inactive.bst_delete(node);

          body.data.payload.forEach((node_info) => {
            if (active.bst_search(this._search_by_xor_lex.bind(this, key), node_info) === null) {
              inactive.bst_insert(
                new Bintree_node({data: node_info}), 
                this._insert_by_xor_lex.bind(this, key)
              );
            }
          });

          resolve(null);
        }, () => {
          inactive.bst_delete(node);
          resolve(null);
        });
      }));
    });

    return await Promise.all(results).then((values) => {
      for (let i = 0; i < values.length; i += 1) {
        if (values[i] !== null) {
          return values[i];
        }
      }
    });
  }

  /**
   * Perform a complete node lookup for 'key'; 'rpc' is the RPC request function, one of either 
   * _req_find_node or _req_find_value; status callback 'cb' is updated with the number of active
   * and inactive nodes after each round
   * 
   * Returns a data of either VAL or NODE_LIST type, depending on outcome
   */ 
  async node_lookup(key, rpc = this._req_find_node, cb = (n_active, n_inactive) => {}) {
    /**
     * Per the Kademlia spec section 2.3, to handle "pathological cases in which there are no lookups
     * for a particular ID range," we record the time at which we last performed a node lookup on
     * this bucket. The k-bucket refresh interval uses this time to determine which buckets to refresh
     */ 
    if (rpc === this._req_find_node) {
      this.find_kbucket_for_id(key).get_data().touch();
    }

    const active = new Bintree();
    const inactive = new Bintree();

    this.get_nodes_closest_to({key: key, max: Kademlia.ALPHA}).forEach((node_info) => {
      inactive.bst_insert(new Bintree_node({data: node_info}), this._insert_by_xor_lex.bind(this, key));
    });

    let last_closest;
    let val;
  
    while (active.size() < Kademlia.K_SIZE && !val) {
      const closest = active.bst_min();
      const n_inactive = inactive.size();

      if (closest === last_closest && n_inactive === 0) {
        break;
      } else if (closest === last_closest && n_inactive > 0) {
        val = await this._do_node_lookup.bind(this, {
          active: active, 
          inactive: inactive, 
          rsz: n_inactive, 
          rpc: rpc, 
          key: key
        })();
      } else {
        last_closest = closest;
        val = await this._do_node_lookup.bind(this, {
          active: active, 
          inactive: inactive, 
          rpc: rpc, 
          key: key
        })();
      }

      cb(active.size(), n_inactive);
    }

    /**
     * CASE 1: A value lookup has successfully returned a value
     */ 
    if (val) {
      const [payload, closest] = val;

      /** 
       * Caching behavior upon successful lookup (section 2.3 in the Kademlia spec): we store the 
       * [key, val] pair at the closest node we observed to the key that did not return the value
       */ 
      if (closest !== null) {
        Journal.log(Kademlia.TAG, `Storing ${key} to keyspace owner ${closest.get_data().node_id}`);
        this._req_store(key, payload[0], closest.get_data());
      }

      return data({type: DATA_TYPE.VAL, payload: payload});
    }

    /**
     * CASE 2: Either a value lookup has failed to return a value, or we performed a node lookup;
     * in both circumstances, we just return a sorted list of the closest nodes we heard about
     */ 
    const sorted = active.dfs_in((node, data) => data.push(node.get_data()));
    return data({type: DATA_TYPE.NODE_LIST, payload: sorted});
  }

  /**
   * This wrapper is used to wrap all the caller-specified timeout functions to enforce contact 
   * locking. Cuirrently we're prohibited from locking ourselves, mostly to avoid cases where 
   * network issues might result in our locking every contact in our routing table. TODO: this is
   * implementing largely (solely?) to prevent the case where a call to get_nodes_closest_to() 
   * returns zero contacts. There's likely a better way to do this.
   */ 
  _contact_lock_timeout(recip_node_info, msg, caller_timeout) {
    if (!compare_info(recip_node_info, this.node_info)) {
      const bucket = this.find_kbucket_for_id(recip_node_info.node_id).get_data();
      const kbucket_rec = bucket.exists(recip_node_info);

      if (kbucket_rec !== null && !kbucket_rec.is_locked()) {
        kbucket_rec.lock(`${Object.keys(RPC)[msg.rpc]} ${Object.keys(MSG_TYPE)[msg.type]} failed`);
      }
    }

    caller_timeout();
  }

  _req_ping(recip_node_info, success, timeout, ttl) {
    const msg = message({
      rpc: RPC.PING,
      from: node_info(this.node_info),
      type: MSG_TYPE.REQ,
      data: data({type: DATA_TYPE.STRING, payload: ["PING"]}),
      id: Bigboy.unsafe_random(Kademlia.ID_LEN)
    });

    this.send({
      body: msg,
      body_type: Codec.BODY_TYPE.JSON,
      rinfo: new Rinfo({address: recip_node_info.addr, port: recip_node_info.port}),
      gen: this.generator(),
      success: success,
      timeout: this._contact_lock_timeout.bind(this, recip_node_info, msg, timeout),
      ttl: ttl
    });
  }

  /**
   * In our network, STORE RPCs are always bearing PHT nodes, and so they're likely to be among the
   * largest data objects sent over the wire. Since peers defer the processing of large chunks of 
   * data until periods of downtime, we uniquely set a very long TTL here; if the recipient is very
   * busy, it might them a few seconds to get to it and send us a RES. TODO: see the roadmap for 
   * discussion about a future system to compute TTL based on outbound message size.
   */
  _req_store(key, val, recip_node_info, success, timeout, ttl = 10000) {
    const msg = message({
      rpc: RPC.STORE,
      from: node_info(this.node_info),
      type: MSG_TYPE.REQ,
      data: data({type: DATA_TYPE.PAIR, payload: [key, val]}),
      id: Bigboy.unsafe_random(Kademlia.ID_LEN)
    });

    this.send({
      body: msg,
      body_type: Codec.BODY_TYPE.JSON,
      rinfo: new Rinfo({address: recip_node_info.addr, port: recip_node_info.port}),
      gen: this.generator(),
      success: success,
      timeout: this._contact_lock_timeout.bind(this, recip_node_info, msg, timeout),
      ttl: ttl
    });
  }

  _req_find_node(key, recip_node_info, success, timeout, ttl) {
    const msg = message({
      rpc: RPC.FIND_NODE,
      from: node_info(this.node_info),
      type: MSG_TYPE.REQ,
      data: data({type: DATA_TYPE.KEY, payload: [key]}),
      id: Bigboy.unsafe_random(Kademlia.ID_LEN)
    });

    this.send({
      body: msg,
      body_type: Codec.BODY_TYPE.JSON,
      rinfo: new Rinfo({address: recip_node_info.addr, port: recip_node_info.port}),
      gen: this.generator(),
      success: success,
      timeout: this._contact_lock_timeout.bind(this, recip_node_info, msg, timeout),
      ttl: ttl
    });
  }

  _req_find_value(key, recip_node_info, success, timeout, ttl) {
    const msg = message({
      rpc: RPC.FIND_VALUE,
      from: node_info(this.node_info),
      type: MSG_TYPE.REQ,
      data: data({type: DATA_TYPE.KEY, payload: [key]}),
      id: Bigboy.unsafe_random(Kademlia.ID_LEN)
    });

    this.send({
      body: msg,
      body_type: Codec.BODY_TYPE.JSON,
      rinfo: new Rinfo({address: recip_node_info.addr, port: recip_node_info.port}),
      gen: this.generator(),
      success: success,
      timeout: this._contact_lock_timeout.bind(this, recip_node_info, msg, timeout),
      ttl: ttl
    });
  }

  _res_ping(req) {
    return message({
      rpc: RPC.PING,
      from: node_info(this.node_info),
      type: MSG_TYPE.RES,
      data: data({type: DATA_TYPE.STRING, payload: ["PONG"]}),
      id: req.id
    });
  }

  _res_store(req) {
    const [key, val] = req.data.payload;

    /**
     * We currently honor deletions from any peer by passing a null value. This functionality exists
     * solely to enable PHT merge operations to immediately remove trimmed nodes from the topology.
     */ 
    if (val === null) {
      this.data.delete(key);
      Journal.log(Kademlia.TAG, `Deleted ${key.toString()} from local storage via ${req.from.node_id}`);
    } else {
      /**
       * To determine TTL for this value, we estimate the number of nodes between us and the key.
       * What tree depth is the k-bucket for our node ID? What tree depth is the k-bucket for the
       * key? The difference betwen those depths approximates our distance from the key wrt the 
       * current topology of the routing table.
       */ 
      const d1 = this.find_kbucket_for_id(this.node_id).get_data().get_prefix().length;
      const d2 = this.find_kbucket_for_id(key).get_data().get_prefix().length;
      const ttl = Kademlia.T_DATA_TTL * Math.pow(2, -(Math.max(d1, d2) - Math.min(d1, d2))); 

      this.data.put({
        key: key,
        val: val,
        ttl: ttl
      });

      Journal.log(Kademlia.TAG, `Added ${key.toString()} to local storage from ${req.from.node_id}`);
    }

    return message({
      rpc: RPC.STORE,
      from: node_info(this.node_info),
      type: MSG_TYPE.RES,
      data: data({type: DATA_TYPE.STRING, payload: ["OK"]}),
      id: req.id
    })
  }

  _res_find_node(req) {
    const nodes = this.get_nodes_closest_to({key: req.data.payload[0], max: Kademlia.K_SIZE});

    return message({
      rpc: RPC.FIND_NODE,
      from: node_info(this.node_info),
      type: MSG_TYPE.RES,
      data: data({type: DATA_TYPE.NODE_LIST, payload: nodes}),
      id: req.id
    });
  }

  _res_find_value(req) {
    const key = req.data.payload[0];
    let ds_rec = this.data.get(key);
  
    /**
     * Lazy deletion: the requested data exists but has expired, so delete it from our data store
     */ 
    if (ds_rec && ds_rec.get_created() < (Date.now() - ds_rec.get_ttl())) {
      this.data.delete(key);
      ds_rec = undefined;
    }

    const msg_data = ds_rec ? data({type: DATA_TYPE.VAL, payload: [ds_rec.get_data()]}) : 
      data({type: DATA_TYPE.NODE_LIST, payload: this.get_nodes_closest_to({key: key})});

    return message({
      rpc: RPC.FIND_VALUE,
      from: node_info(this.node_info),
      type: MSG_TYPE.RES,
      data: msg_data,
      id: req.id
    });
  }

  _on_req(gen, msg) {
    const handler = this.RPC_HANDLER.get(msg.rpc);

    // Bad RPC type
    if (!handler) {
      return;
    }

    this.send({
      body: handler.bind(this)(msg),
      body_type: Codec.BODY_TYPE.JSON,
      rinfo: new Rinfo({address: msg.from.addr, port: msg.from.port}),
      gen: Codec.get_gen_res(gen),
      ttl: Kademlia.DEFAULT_TTL
    });
  }

  /**
   * Fetch an array of the node_infos in our routing table that are closest to 'key'
   * TODO: this is an unoptimized naive approach, we collect every node by traversing the entire
   * routing table, then sort by each node's distance from the key... an optimization approach might
   * be to start our search at the leaf node and visit adjacent buckets in the routing table by
   * their distance from our ID, ending the search when hit max, then sort by distance from the key
   */ 
  get_nodes_closest_to({key, max = Kademlia.K_SIZE, get_locked = false, get_stale = false} = {}) {
    const all_nodes = this.routing_table.dfs_post((node, data) => {
      const bucket = node.get_data();
      
      if (bucket !== null) {
        data.push(...bucket.to_array().filter((kbucket_rec) => {
          if (!get_locked && !get_stale) {
            return !kbucket_rec.is_locked() && !kbucket_rec.is_stale();
          } else if (get_locked && !get_stale) {
            return !kbucket_rec.is_stale();
          } else if (!get_locked && get_stale) {
            return !kbucket_rec.is_locked();
          } else {
            return true;
          }
        }));
      }
    });

    const sorted_node_infos = all_nodes.map(kbucket_rec => kbucket_rec.node_info).sort((a, b) => 
      Kademlia.get_distance(key, a.node_id).greater(Kademlia.get_distance(key, b.node_id)) ? 
        1 : -1);

    return sorted_node_infos.splice(0, Math.min(max, sorted_node_infos.length));
  }

  init_intervals() {
    /**
     * Bucket refresh interval
     */ 
    if (this.refresh_interval_handle === null) {
      this.refresh_interval_handle = setInterval(() => {
        const t_expiry = Date.now() - Kademlia.T_KBUCKET_REFRESH;

        const all_buckets = this.routing_table.dfs_post((node, data) => {
          const bucket = node.get_data();

          if (bucket !== null) {
            data.push(bucket);
          }
        });
      
        all_buckets.forEach((bucket) => {
          if (bucket.get_touched() < t_expiry) {
            this.refresh_kbucket(bucket);
          }
        });
      }, Kademlia.T_KBUCKET_REFRESH);
    }

    Journal.log(Kademlia.TAG, `K-bucket refresh interval: ` + 
      `${(Kademlia.T_KBUCKET_REFRESH / 60 / 1000).toFixed(1)} minutes`);

    /**
     * Data republish interval
     */ 
    if (this.republish_interval_handle === null) {
      this.republish_interval_handle = setInterval(async () => {
        /**
         * TODO: write republication logic, or eliminate this entirely - see publish() below
         */ 
      }, Kademlia.T_REPUBLISH);
    }

    Journal.log(Kademlia.TAG, `Data republish interval: ` + 
      `${(Kademlia.T_REPUBLISH / 60 / 60 / 1000).toFixed(1)} hours`);

    /**
     * Data replication interval
     */ 
    if (this.replicate_interval_handle === null) {
      this.replicate_interval_handle = setInterval(() => {
        this.data.entries().forEach((pair) => {
          const [key_str, ds_rec] = pair;
          const t1 = Date.now();

          // No one's issued a STORE on this data for a while? Let's do a PUT on it
          if (t1 > (ds_rec.get_created() + Fkad_node.T_REPLICATE) && 
            t1 < (ds_rec.get_created() + ds_rec.get_ttl())) {
            this.put(new Fbigint(key_str), ds_rec.get_data());
          }
        });
      }, Kademlia.T_REPLICATE);
    }

    Journal.log(Kademlia.TAG, `Replication interval: ` + 
      `${(Kademlia.T_REPLICATE / 60 / 60 / 1000).toFixed(1)} hours`);
  }

  stop_intervals() {
    if (this.refresh_interval_handle) {
      clearInterval(this.refresh_interval_handle);
      this.refresh_interval_handle = null;
    }

    if (this.republish_interval_handle) {
      clearInterval(this.republish_interval_handle);
      this.republish_interval_handle = null;
    }

    if (this.replicate_interval_handle) {
      clearInterval(this.replicate_interval_handle);
      this.replicate_interval_handle = null;
    }
  }

  on_message(gen, body, rinfo) {
    super.on_message(gen, body, rinfo);
    this.routing_table_insert(body.from);

    if (Codec.is_gen_req(gen)) {
      this._on_req(gen, body);
    }
  }
}

module.exports = { Kademlia };