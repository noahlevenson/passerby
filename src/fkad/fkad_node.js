/** 
* FKAD_NODE
* The nucleus of FKAD, implementing a modified
* version of the Kademlia prototocol
* 
*
*
*/ 

"use strict";


const { Fapp_cfg } = require("../fapp/fapp_cfg.js");
const cfg = require("../../libfood.json");  
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Fapp_bboard } = require("../fapp/fapp_bboard.js");
const { Flog } = require("../flog/flog.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js");
const { Fkad_net } = require("./net/fkad_net.js");
const { Fkad_eng } = require("./eng/fkad_eng.js");
const { Fkad_node_info } = require("./fkad_node_info.js");
const { Fkad_kbucket } = require("./fkad_kbucket.js");
const { Fkad_kbucket_rec } = require("./fkad_kbucket_rec.js"); 
const { Fkad_msg } = require("./fkad_msg.js");
const { Fkad_ds } = require("./fkad_ds.js");
const { Fkad_data } = require("./fkad_data.js");
const { Fbintree } = require("../ftypes/fbintree/fbintree.js");
const { Fbintree_node } = require("../ftypes/fbintree/fbintree_node.js");
const { Fid } = require("../fid/fid.js");
const { Fgeo_coord } = require("../fgeo/fgeo_coord.js");
const { Fpht_node } = require("../fpht/fpht_node.js");

class Fkad_node {
  static DHT_BIT_WIDTH = 160;
  static ID_LEN = this.DHT_BIT_WIDTH / cfg.SYS_BYTE_WIDTH;
  static K_SIZE = 20;
  static ALPHA = 3;
  // T_KBUCKET_REFRESH: How frequently to force a refresh on stale k-buckets?
  // 1000 * 60 * 60 is default, but very frequent refreshes help with churn in tiny networks
  static T_KBUCKET_REFRESH = 1000 * 5;
  // T_DATA_TTL: How long does data live on this network?
  static T_DATA_TTL = (1000 * 60 * 60 * 24) + (1000 * 20);
  // T_REPUBLISH: How often do we republish our owned data? 
  static T_REPUBLISH = 1000 * 60 * 60 * 24;
  // T_REPLICATE: How often do we republish our entire data store?
  static T_REPLICATE = 1000 * 60 * 60;

  net;
  eng;
  node_id;
  node_info;
  routing_table;
  refresh_interval_handle;
  republish_interval_handle;
  replicate_interval_handle;
  data;

  RPC_RES_EXEC = new Map([
    [Fkad_msg.RPC.PING, this._res_ping],
    [Fkad_msg.RPC.STORE, this._res_store],
    [Fkad_msg.RPC.FIND_NODE, this._res_find_node],
    [Fkad_msg.RPC.FIND_VALUE, this._res_find_value]
  ]);

  // net as an Fkad_net module, eng as an Fkad_eng module, addr and port must solve NAT
  constructor({net = null, eng = null, addr = null, port = null, pubkey = null} = {}) {
    if (!(net instanceof Fkad_net)) {
      throw new TypeError("Argument 'net' must be instance of Fkad_net");
    }

    if (!(eng instanceof Fkad_eng)) {
      throw new TypeError("Argument 'eng' must be instance of Fkad_eng");
    }

    this.refresh_interval_handle = null;
    this.republish_interval_handle = null;

    this.net = net;
    this.eng = eng;
    this.node_id = new Fbigint(Fcrypto.sha1(pubkey));

    this.node_info = new Fkad_node_info({
      addr: addr, 
      port: port, 
      node_id: new Fbigint(this.node_id), 
      pubkey: pubkey
    });

    this.routing_table = new Fbintree(new Fbintree_node({
      data: new Fkad_kbucket({max_size: Fkad_node.K_SIZE, prefix: ""})
    }));

    this.network_data = new Fkad_ds();
    this.rp_data = new Fkad_ds();

    this.eng.node = this;
    this.net.node = this;
  }

  // Enforce data integrity on the DHT, we'll run this on any data we receive
  // and on any data that a peer asks us to store
  static async _is_valid_storable(data) {
    try {
      // We only store PHT nodes to our DHT
      if (!Fpht_node.valid_magic(data)) {
        return false;
      }

      // TODO: there should be a Fpht_node static method for this,
      // and Fpht_nodes shouldn't have any instance methods at all
      const pht_node = new Fpht_node(data);
      const pairs = pht_node.get_all_pairs();

      for (let i = 0; i < pairs.length; i += 1) {
        const location_key = pairs[i][0];
        const bboard = pairs[i][1];

        // location_key must be an n-bit location key and
        // bboard must be a valid Fapp_bboard object
        // TODO: write me

        // The data must be published by a peer with a valid proof of work
        // TODO: this is insecure until we replace Fid.hash_cert with a new 
        // system which hashes over the entire Fid_pub
        const pow = Fid.is_valid_pow(
          Fid.hash_cert(bboard.cred.pubkey, bboard.cred.nonce), 
          Fid.POW_LEAD_ZERO_BITS
        );

        if (!pow) {
          return false;
        }

        // The data must be published by a peer who's in the strong set
        // TODO: write me

        // The data must be signed by the genuine owner of the named keypair
        const valid_sig = await Fapp_bboard.verify(bboard, bboard.cred.pubkey);

        if (!valid_sig) {
          return false;
        }

        // The location_key matches the lat/long found in the signed data
        // TODO: this is also insecure until we replace Fid.hash_cert as above
        const coord = new Fgeo_coord({lat: bboard.cred.lat, long: bboard.cred.long});
        const valid_lk = new Fbigint(location_key).equals(coord.linearize());

        if (!valid_lk) {
          return false;
        }
      }

      return true;
    } catch (err) {
      return false;
    } 
  }
  
  // Get XOR "distance" between two Fbigint values
  static _get_distance(key1, key2) {
    return key1.xor(key2);
  }

  // Prints using DFS
  _debug_print_routing_table() {
    Flog.log(`*******************************************`, true);
    Flog.log(`[FKAD] FKAD_NODE _DEBUG_PRINT_ROUTING_TABLE:`);

    this.routing_table.dfs((node, data) => {
      const bucket = node.get_data();
      
      if (bucket !== null) {
        Flog.log(`[FKAD] prefix "${bucket.get_prefix()}" - ${bucket.length()} contacts`);
      }
    });
  }

  // TODO: to get a "random ID in the bucket's range," we're selecting a random node in the bucket
  // it's prob more rigorous to generate a random ID in the bucket's range
  async _refresh_kbucket(kbucket) {
    const random_id = kbucket.get(Math.floor(Math.random() * kbucket.length())).node_info.node_id;
    const prefix = kbucket.get_prefix();
    Flog.log(`[FKAD] Refreshing k-bucket ${prefix.length === 0 ? "[root]" : prefix} ` + 
      `(${kbucket.length()} contact${kbucket.length() > 1 ? "s" : ""})`);
    await this._node_lookup(random_id);
  }

  // Find the appropriate leaf node in the routing table for a given node ID
  find_kbucket_for_id(id) {
    let node = this.routing_table.get_root();
    let i = 0;

    // TODO: this can prob be simplified since our tree seems to be a perfect tree
    // leafs always split into two children so we don't need to know the value of b before we enter 
    // the loop - we can just say "while this node's children are not null, keep going"
    while (true) {
      const b = id.get_bit(i);

      if (node.get_child_bin(b) === null) {
        break;
      }

      node = node.get_child_bin(b);
      i += 1;
    }

    return node;
  }

  // TODO: this god function is not chad mode
  // we need to separate its concerns: decide if a contact needs to be inserted, split buckets 
  // in the routing table, replicate data to new contacts... need to design things better: how
  // and why does the eng initiate the insertion of new contacts and replicating data to them?
  _routing_table_insert(inbound_node_info) {
    let leaf_node = this.find_kbucket_for_id(inbound_node_info.node_id);
    let bucket = leaf_node.get_data();
    const kbucket_rec = bucket.exists(inbound_node_info);

    // TODO: a locked contact is silently unlocked before insertion by wrapping it in a fresh 
    // Fkad_kbucket_rec; it's bad for code comprehension bc the locking occurs in Fkad_eng_alpha 
    const new_kbucket_rec = new Fkad_kbucket_rec({node_info: inbound_node_info});

    if (kbucket_rec !== null) {
      // We've already seen this node in this bucket, so just move a fresh record to the tail
      bucket.delete(kbucket_rec);
      bucket.enqueue(new_kbucket_rec);
    } else if (kbucket_rec === null && !bucket.is_full()) {
      // We've never seen this node and the appropriate bucket isn't full, so just insert it
      bucket.enqueue(new_kbucket_rec);

      // Replicate any of our data that is appropriate to this new node
      this.network_data.entries().forEach((pair) => {
        const key = new Fbigint(pair[0]);
        const cnodes = this._get_nodes_closest_to({key: key});

        // If the new node is one of the K closest nodes to this key AND we are closer to the key 
        // than any of my neighbors (or the new node is now closer to the key than we are), then 
        // replicate this (key, value) pair to the new node
        if (cnodes.includes(inbound_node_info) && 
          (Fkad_node._get_distance(this.node_id, key).less_equal(
            Fkad_node._get_distance(cnodes[0].node_id, key) || 
              cnodes[0] === inbound_node_info))) {
          
          Flog.log(`[FKAD] Replicating ${key.toString()} to new node ` +
          `${inbound_node_info.node_id.toString()}`);

          this._req_store(key, pair[1].get_data(), inbound_node_info);
        }
      });
    } else {
      // We've never seen this node but the appropriate bucket is full
      const our_bucket = this.find_kbucket_for_id(this.node_id).get_data();

      if (bucket === our_bucket) {
        // The incoming node_info's bucket's range includes our ID, so split the bucket
        const left_child = new Fbintree_node({
          parent: leaf_node, 
          data: new Fkad_kbucket({max_size: Fkad_node.K_SIZE, prefix: `${bucket.get_prefix()}0`})
        });

        const right_child = new Fbintree_node({
          parent: leaf_node,
          data: new Fkad_kbucket({max_size: Fkad_node.K_SIZE, prefix: `${bucket.get_prefix()}1`})
        });

        leaf_node.set_left(left_child);
        leaf_node.set_right(right_child);
        leaf_node.set_data(null);

        // Redistribute the Fkad_kbucket_recs from the old bucket to the new leaves
        bucket.to_array().forEach((kbucket_rec) => {
          const b = kbucket_rec.node_info.node_id.get_bit(bucket.get_prefix().length);
          leaf_node.get_child_bin(b).get_data().enqueue(kbucket_rec);
        });

        // Attempt reinsertion via recursion
        this._routing_table_insert(inbound_node_info);
      } else {
        // TODO: This case requires an implementation!

        // Per the optimizations in section 4.1, we're supposed to add the new contact to the 
        // "replacement cache" and do lazy replacement the next time we need to access the bucket

        // Unresolved: if a new contact is discarded (or moved to the replacement cache), 
        // are we supposed to replicate our data to them? Is that mathematically poss?
      }
    }
  }

  // Congratulations, you have achieved 100% code complexity
  async _node_lookup(key, rpc = this._req_find_node) {
    // BST comparator for insertion: sort by both XOR distance and lexicographical distance of its 
    // concatenated addr and port -- i.e., keep our node_info BST sorted by distance while also 
    // allowing for items which share the same key but have different network info bc of churn
    function _by_distance_and_lex(node, oldnode) {
      if (Fkad_node._get_distance(key, node.get_data().node_id).less(
        Fkad_node._get_distance(key, oldnode.get_data().node_id))) {
        return -1;
      } else if (Fkad_node._get_distance(key, node.get_data().node_id).greater(
        Fkad_node._get_distance(key, oldnode.get_data().node_id))) {
        return 1;
      }

      // The complex case: the new node_info has the same key, so lexically compare the network info
      const node_net_info = `${node.get_data().addr}${node.get_data().port}`;
      const oldnode_net_info = `${oldnode.get_data().addr}${oldnode.get_data().port}`;
      return node_net_info.localeCompare(oldnode_net_info);
    }

    // BST comparator for search: search by node ID ordered by distance from 'key' in the enclosing scope
    // TODO: this is confusing
    function _by_strict_equality(k, node) {
      const node_info = node.get_data();

      if (Fkad_node._get_distance(key, k.node_id).less(
        Fkad_node._get_distance(key, node_info.node_id))) {
        return -1;
      } else if (Fkad_node._get_distance(key, k.node_id).greater(
        Fkad_node._get_distance(key, node_info.node_id))) {
        return 1;
      }

      // The complex case: there's two objects with the same node ID, so it's lexical comparison time
      const node_net_info = `${k.addr}${k.port}`;
      const oldnode_net_info = `${node_info.addr}${node_info.port}`;
      return node_net_info.localeCompare(oldnode_net_info);
    }

    // Send the RPCs and maintain the node lists
    // Returns a value if one is found, otherwise returns undefined
    async function _do_node_lookup(active, inactive, rsz = Fkad_node.ALPHA) {
      const contacts = [];
      let node = inactive.bst_min();

      while (node !== null && contacts.length < rsz) {
        contacts.push(node);
        node = inactive.bst_successor(node);
      }

      const res = [];
      
      contacts.forEach((node) => {
        res.push(new Promise((resolve, reject) => {
          rpc.bind(this)(key, node.get_data(), (res, ctx) => {
            if (res.data.type === Fkad_data.TYPE.VAL) {
              Fkad_node._is_valid_storable(res.data.payload[0]).then((is_valid) => {
                resolve(is_valid ? [res.data.payload, active.bst_min()] : null);
              });

              return;
            } 

            active.bst_insert(new Fbintree_node({data: res.from}), _by_distance_and_lex.bind(this));
            inactive.bst_delete(node);

            res.data.payload.forEach((node_info) => {
              if (active.bst_search(_by_strict_equality.bind(this), node_info) === null) {
                inactive.bst_insert(new Fbintree_node({data: node_info}), _by_distance_and_lex.bind(this));
              }
            });

            resolve(null);
          }, () => {
            inactive.bst_delete(node);
            resolve(null);
          });
        }));
      });

      return await Promise.all(res).then((values) => {
        for (let i = 0; i < values.length; i += 1) {
          if (values[i] !== null) {
            return values[i];
          }
        }
      });
    }

    // *** INIT ***
    const active = new Fbintree();
    const inactive = new Fbintree();

    this._get_nodes_closest_to({key: key, max: Fkad_node.ALPHA}).forEach((node_info) => {
      inactive.bst_insert(new Fbintree_node({data: node_info}), _by_distance_and_lex.bind(this));
    });

    let lc;
    let val;
  
    // *** MAIN LOOP ***
    while (active.size() < Fkad_node.K_SIZE && !val) {
      const c = active.bst_min();
      const isz = inactive.size();

      if (c === lc && isz === 0) {
        break;
      } else if (c === lc && isz > 0) {
        val = await _do_node_lookup.bind(this, active, inactive, isz)();
      } else {
        lc = c;
        val = await _do_node_lookup.bind(this, active, inactive)();
      }
    }

    if (val) {
      if (val[1] !== null) {
        this._req_store(key, val[0][0], val[1].get_data(), (res, ctx) => {
          Flog.log(`[FKAD] Stored ${key} to node ${val[1].get_data().node_id}`);
        });
      }

      return new Fkad_data({type: Fkad_data.TYPE.VAL, payload: val[0]});
    }

    const sorted = active.inorder((node, data) => {
      data.push(node.get_data());
      return data;  
    });

    return new Fkad_data({type: Fkad_data.TYPE.NODE_LIST, payload: sorted});
  }

  _req_ping(node_info, success, timeout) {
    const msg = new Fkad_msg({
      rpc: Fkad_msg.RPC.PING,
      from: new Fkad_node_info(this.node_info),
      type: Fkad_msg.TYPE.REQ,
      id: Fbigint.unsafe_random(Fkad_node.ID_LEN)
    });

    this.eng._send(msg, node_info, success, timeout);
  }

  _req_store(key, val, node_info, success, timeout) {
    const msg = new Fkad_msg({
      rpc: Fkad_msg.RPC.STORE,
      from: new Fkad_node_info(this.node_info),
      type: Fkad_msg.TYPE.REQ,
      data: new Fkad_data({type: Fkad_data.TYPE.PAIR, payload: [key, val]}),
      id: Fbigint.unsafe_random(Fkad_node.ID_LEN)
    });

    this.eng._send(msg, node_info, success, timeout);
  }

  _req_find_node(key, node_info, success, timeout) {
    const msg = new Fkad_msg({
      rpc: Fkad_msg.RPC.FIND_NODE,
      from: new Fkad_node_info(this.node_info),
      type: Fkad_msg.TYPE.REQ,
      data: new Fkad_data({type: Fkad_data.TYPE.KEY, payload: [key]}),
      id: Fbigint.unsafe_random(Fkad_node.ID_LEN)
    });

    this.eng._send(msg, node_info, success, timeout);
  }

  _req_find_value(key, node_info, success, timeout) {
    const msg = new Fkad_msg({
      rpc: Fkad_msg.RPC.FIND_VALUE,
      from: new Fkad_node_info(this.node_info),
      type: Fkad_msg.TYPE.REQ,
      data: new Fkad_data({type: Fkad_data.TYPE.KEY, payload: [key]}),
      id: Fbigint.unsafe_random(Fkad_node.ID_LEN)
    });

    this.eng._send(msg, node_info, success, timeout); 
  }

  _res_ping(req) {
    return new Fkad_msg({
      rpc: Fkad_msg.RPC.PING,
      from: new Fkad_node_info(this.node_info),
      type: Fkad_msg.TYPE.RES,
      data: new Fkad_data({type: Fkad_data.TYPE.STRING, payload: ["PONG"]}),
      id: req.id
    });
  }

  _res_store(req) {
    Fkad_node._is_valid_storable(req.data.payload[1]).then((res) => {
      if (!res) {
        return;
      }

      // # of nodes between us and the key is approximated from the tree depth of their buckets
      const d1 = this.find_kbucket_for_id(this.node_id).get_data().get_prefix().length;
      const d2 = this.find_kbucket_for_id(req.data.payload[0]).get_data().get_prefix().length;
      const ttl = Fkad_node.T_DATA_TTL * Math.pow(2, -(Math.max(d1, d2) - Math.min(d1, d2))); 

      this.network_data.put({
        key: req.data.payload[0].toString(),
        val: req.data.payload[1],
        ttl: ttl
      });
    });
    
    return new Fkad_msg({
      rpc: Fkad_msg.RPC.STORE,
      from: new Fkad_node_info(this.node_info),
      type: Fkad_msg.TYPE.RES,
      data: new Fkad_data({type: Fkad_data.TYPE.STRING, payload: ["OK"]}),
      id: req.id
    });
  }

  _res_find_node(req) {
    const nodes = this._get_nodes_closest_to({key: req.data.payload[0], max: Fkad_node.K_SIZE});

    return new Fkad_msg({
      rpc: Fkad_msg.RPC.FIND_NODE,
      from: new Fkad_node_info(this.node_info),
      type: Fkad_msg.TYPE.RES,
      data: new Fkad_data({type: Fkad_data.TYPE.NODE_LIST, payload: nodes}),
      id: req.id
    });
  }

  _res_find_value(req) {
    let payload;
    let type;

    let ds_rec = this.network_data.get(req.data.payload[0].toString());

    // Lazy deletion: the requested data exists but has expired, so delete it from our data store
    if (ds_rec && Date.now() > (ds_rec.get_created() + ds_rec.get_ttl())) {
      this.network_data.delete(req.data.payload[0].toString());
      ds_rec = undefined;
    }

    if (ds_rec) {
      payload = [ds_rec.get_data()];
      type = Fkad_data.TYPE.VAL;
    } else {
      payload = this._get_nodes_closest_to({key: req.data.payload[0], max: Fkad_node.K_SIZE});
      type = Fkad_data.TYPE.NODE_LIST;
    }

    return new Fkad_msg({
      rpc: Fkad_msg.RPC.FIND_VALUE,
      from: new Fkad_node_info(this.node_info),
      type: Fkad_msg.TYPE.RES,
      data: new Fkad_data({type: type, payload: payload}),
      id: req.id
    });
  }

  _on_req(msg) {
    const res = this.RPC_RES_EXEC.get(msg.rpc).bind(this)(msg);
    this.eng._send(res, msg.from)
  }

  // Very unoptimized: just collect all the nodes we know about by traversing the entire routing
  // table, then sort by each node's distance from the key...
  // TODO: try optimizing by starting our search at the leaf node and visiting adjacent buckets
  // in the routing table by their distance from our ID, ending the search when we hit the max,
  // then sort by distance from the key...
  _get_nodes_closest_to({key, max = Fkad_node.K_SIZE, get_locked = false, get_stale = false} = {}) {
    // Touch the bucket so we know it's not a pathological case
    this.find_kbucket_for_id(key).get_data().touch();

    const all_nodes = this.routing_table.dfs((node, data) => {
      const bucket = node.get_data();
      
      if (bucket !== null) {
        data = data.concat(bucket.to_array().filter(kbucket_rec => {
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

      return data;
    });

    const sorted_node_infos = all_nodes.map(kbucket_rec => kbucket_rec.node_info).sort((a, b) => 
      Fkad_node._get_distance(key, a.node_id).greater(Fkad_node._get_distance(key, b.node_id)) ? 
        1 : -1);

    return sorted_node_infos.splice(0, Math.min(max, sorted_node_infos.length));
  }

  _init_intervals() {
    // Idempotently start the bucket refresh interval
    if (this.refresh_interval_handle === null) {
      this.refresh_interval_handle = setInterval(() => {
        const t1 = Date.now() - Fkad_node.T_KBUCKET_REFRESH;

        const all_buckets = this.routing_table.dfs((node, data) => {
          const bucket = node.get_data();

          if (bucket !== null) {
            data.push(bucket);
          }

          return data;
        });
      
        all_buckets.forEach((bucket) => {
          if (bucket.get_touched() < t1) {
            this._refresh_kbucket(bucket);
          }
        });
      }, Fkad_node.T_KBUCKET_REFRESH);
    }

    Flog.log(`[FKAD] K-bucket refresh interval: ` + 
      `${(Fkad_node.T_KBUCKET_REFRESH / 60 / 60 / 1000).toFixed(1)} hours`);

    // Idempotently start the data republish interval
    if (this.republish_interval_handle === null) {
      this.republish_interval_handle = setInterval(() => {
        this.rp_data.entries().forEach((pair) => {
          this.put(new Fbigint(pair[0]), pair[1].get_data(), true);
        });
      }, Fkad_node.T_REPUBLISH);
    }

    Flog.log(`[FKAD] Data republish interval: ` + 
      `${(Fkad_node.T_REPUBLISH / 60 / 60 / 1000).toFixed(1)} hours`);

    // Idempotently start the data replication interval
    if (this.replicate_interval_handle === null) {
      this.replicate_interval_handle = setInterval(() => {
        this.network_data.entries().forEach((pair) => {
          const t1 = Date.now();

          // No one's issued a STORE on this data for a while? Let's do a PUT on it
          if (t1 > (pair[1].get_created() + Fkad_node.T_REPLICATE) && 
            t1 < (pair[1].get_created() + pair[1].get_ttl())) {
            this.put(new Fbigint(pair[0]), pair[1].get_data());
          }
        });
      }, Fkad_node.T_REPLICATE);
    }

    Flog.log(`[FKAD] Replication interval: ` + 
      `${(Fkad_node.T_REPLICATE / 60 / 60 / 1000).toFixed(1)} hours`);
  }

  // Supply the addr, port, and pubkey of the bootstrap node
  async bootstrap({addr = null, port = null, pubkey = null} = {}) {
    this.net.network.on("message", this.eng._on_message.bind(this.eng));
    
    const node_info = new Fkad_node_info({
      addr: addr, 
      port: port, 
      pubkey: pubkey, 
      node_id: new Fbigint(Fcrypto.sha1(pubkey))
    });

    const ping_res = await new Promise((resolve, reject) => {
      this._req_ping(
        node_info,
        (res, ctx) => resolve(res.from),
        () => resolve(null)
      );
    });

    if (ping_res === null) {
      Flog.log(`[FKAD] No PONG from bootstrap node ${addr}:${port}`);
      return false;
    }

    Flog.log(`[FKAD] Joining network as ${this.node_id.toString()} ` + 
      `via bootstrap node ${addr}:${port}...`);

    const bucket = this.find_kbucket_for_id(ping_res.node_id).get_data();
    bucket.enqueue(new Fkad_kbucket_rec({node_info: ping_res}));

    // Do a node lookup on myself, refresh every k-bucket further away from my closest neighbor
    const lookup_res = await this._node_lookup(this.node_id);
    const closest_nodes = lookup_res.payload;
    let i = 0;

    while (i < closest_nodes.length - 1 && closest_nodes[i].node_id.equals(this.node_id)) {
      i += 1;
    }

    i += 1
    const buckets = new Set();

    while (i < closest_nodes.length) {
      buckets.add(this.find_kbucket_for_id(closest_nodes[i].node_id).get_data());
      i += 1
    } 

    buckets.forEach(bucket => this._refresh_kbucket(bucket));

    const npeers = this._get_nodes_closest_to({
      key: this.node_id, 
      max: Number.POSITIVE_INFINITY
    }).length;

    Flog.log(`[FKAD] Success: node ${this.node_id.toString()} is online! ` + 
      `(Discovered ${npeers} peers)`);

    this._init_intervals();
    return true;
  }

  // Publish data to the peer network; if rp = true, we'll republish data every T_REPUBLISH ms 
  // Data that is not republished will expire after T_DATA_TTL ms
  async put(key, val, rp = false) {
    if (rp) {
      this.rp_data.put({
        key: key,
        val: val,
        ttl: Number.POSITIVE_INFINITY
      });
    }

    const result = await this._node_lookup(key);
    const kclosest = result.payload;
    const resolutions = [];
    let successful = 0;

    kclosest.forEach((node_info) => {
      resolutions.push(new Promise((resolve, reject) => {
        this._req_store(key, val, node_info, (res, ctx) => {
          successful += 1;
          resolve();
        }, () => {
          resolve();
        });
      }));
    });

    await Promise.all(resolutions);
    return successful > 0 ? true : false;
  }

  async get(key) {
    const result = await this._node_lookup(key, this._req_find_value);
    return result;
  }

  // Unpublish data that you originally published; deleted data will start to disappear from
  // the network after T_DATA_TTL ms
  delete(key) {
    return this.rp_data.delete(key);
  }
}

module.exports.Fkad_node = Fkad_node;