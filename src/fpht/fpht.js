/** 
* FPHT
* Prefix hash tree built atop FKAD
* 
* 
*
*
*/ 

"use strict";

const { Fapp_env } = require("../fapp/fapp_env.js");
const { Fbigint } = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Flog } = require("../flog/flog.js");
const { Futil } = require("../futil/futil.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js"); 
const { Fkad_data } = require("../fkad/fkad_data.js");
const { Fpht_node } = require("./fpht_node.js");

class Fpht {
  // BIT_DEPTH is the size of our input keys (our Fgeo linearizations are currently 80 bits)
  static BIT_DEPTH = 80;
  // B is block size, aka max keys per leaf
  static B = 1000;

  // reference to the DHT node associated with this PHT interface
  dht_node;
  // reference to the above node's lookup function
  dht_lookup_func;
  // array of args to pass to above DHT lookup function to make it perform a value-based lookup
  dht_lookup_args;
  // Some unique string identifier for the attribute that we're indexing with this PHT interface
  index_attr;
  // Replicable data, the data we have inserted into the PHT and are responsible for republishing
  rp_data;
  // TTL computed from the DHT's TTL
  ttl;
  refresh_interval_handle;
  
  constructor({
    index_attr = null, 
    dht_node = null, 
    dht_lookup_func = null, 
    dht_ttl = null, 
    dht_lookup_args = []
  } = {}) {
    if (typeof index_attr !== "string") {
      throw new TypeError("Argument index_attr must be a string");
    } 

    if (typeof dht_lookup_func !== "function") {
      throw new TypeError("Argument dht_lookup must be a function");
    }

    if (typeof dht_ttl !== "number") {
      throw new TypeError("Argument dht_ttl must be a number");

    }

    if (!Array.isArray(dht_lookup_args)) {
      throw new TypeError("Argument dht_lookup_args must be an Array");
    }
    
    this.dht_node = dht_node;
    this.dht_lookup_func = dht_lookup_func;
    this.dht_lookup_args = dht_lookup_args;
    this.ttl = Math.floor(dht_ttl / 2);
    this.index_attr = index_attr;
    this.rp_data = new Map();
    this.refresh_interval_handle = null;
  }

  // Print PHT stats: walk the whole tree and print everything we know about it
  async _debug_print_stats() {
    async function _walk(pht_node, nodes = 0, keys = 0, leaves = 0) {
      if (!pht_node.is_leaf()) {
        const child0 = await this._dht_lookup(pht_node.children[0x00]);
        const child1 = await this._dht_lookup(pht_node.children[0x01]);

        if (child0 === null || child1 === null) {
          throw new Error("Fatal PHT graph error");
        }

        ({nodes, keys, leaves} = await _walk.bind(this)(child0, nodes, keys, leaves));
        ({nodes, keys, leaves} = await _walk.bind(this)(child1, nodes, keys, leaves));
      }

      Flog.log(`[FPHT] ${this.index_attr}${pht_node.label} ${pht_node.is_leaf() ? 
        "<- LEAF, " + pht_node.size() + " KEYS" : ""}`);

      keys += pht_node.size();
      nodes += 1;

      if (pht_node.is_leaf()) {
        leaves += 1;
      }

      return {nodes: nodes, keys: keys, leaves: leaves};
    }

    const root_node = await this._debug_get_root_node();

    if (root_node === null) {
      Flog.log(`[FPHT] Stats error: no root node found!`);
      return null;
    }

    Flog.log(`[FPHT] DEBUG - PHT STRUCTURE (INVERTED):`, true);
    const res = await _walk.bind(this)(root_node);
    Flog.log(`[FPHT] TOTAL STATS - nodes: ${res.nodes}, leaves: ${res.leaves}, keys: ${res.keys}\n`); 
  }

  // Get the root node, or null if we can't find it
  async _debug_get_root_node() {
    return await this._dht_lookup();
  }

  // Retrieve a PHT node from the DHT; rehydrates and returns the node if found, null if not
  async _dht_lookup(label = "") {
    if (label === null) {
      return null;
    }

    const label_hash = this._get_label_hash(label);
    const res = await this.dht_lookup_func.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

    // TODO: This assumes that dht lookups always return an Fkad_data type, is MAYBE true?
    const data = new Fkad_data(res);

    if (data.get_type() !== Fkad_data.TYPE.VAL || !Fpht_node.valid_magic(data.get_payload()[0])) {
      return null;
    }

    return new Fpht_node(data.get_payload()[0]);
  }

  // Compute the hash of a PHT node label; pass no arg to get the label hash of the root node
  _get_label_hash(data = "") {
    if (typeof data !== "string") {
      throw new TypeError("Argument 'data' must be string");
    }

    return new Fbigint(Fcrypto.sha1(`${this.index_attr}${data}`));
  }

  // Idempotently init a new PHT structure, indexing on index_attr, and kick off the refresh interval
  async init() {
    if (this.refresh_interval_handle === null) {
      this.refresh_interval_handle = setInterval(() => {
        const t1 = Date.now();

        this.rp_data.forEach(async (val, key) => {
          Flog.log(`[FPHT] Refreshing key ${key}`);
          const k = new Fbigint(key);
          await this.insert(k, val);

          let leaf = await this.lookup_bin(k.to_bin_str(Fpht.BIT_DEPTH), true);

          if (leaf === null) {
            leaf = await this.lookup_lin(k.to_bin_str(Fpht.BIT_DEPTH), true);
          }

          if (leaf === null) {
            throw new Error("Fatal PHT graph error");
          }

          let plabel = leaf.get_parent_label();

          while (plabel !== null) {
            let parent = await this._dht_lookup(plabel);

            if (parent === null) {
              throw new Error("Fatal PHT graph error");
            }

            if (t1 > parent.get_created() + this.ttl) {
              await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(parent.get_label()), parent);
            } else {
              break;
            }

            plabel = parent.get_parent_label();
          }
        });
      }, this.ttl);
    }

    Flog.log(`[FPHT] Key refresh interval: ${(this.ttl / 60 / 60 / 1000).toFixed(1)} hours`);

    Flog.log(`[FPHT] Looking up root node for index attr ${this.index_attr}...`);
    const data = await this._dht_lookup();

    if (data !== null) {
      Flog.log(`[FPHT] Root node found! Created ${new Date(data.created)}`);
      return;
    }

    Flog.log(`[FPHT] No root node found! Creating new root structure for index attr ${this.index_attr}...`);
    const root = new Fpht_node({label: ""});
    const res = await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(), root);

    if (!res) {
      Flog.log(`[FPHT] WARNING! COULD NOT CREATE NEW ROOT STRUCTURE FOR INDEX ATTR ${this.index_attr}!`);
    }
  }

  // Find the PHT leaf node responsible for a given key, linear search edition
  // Returns null if there's no leaf node associated with that key
  async lookup_lin(key_str, leaf = true) {
    for (let i = 0; i < key_str.length; i += 1) {
      const pht_node = await this._dht_lookup(key_str.substring(0, i));
      
      if (pht_node !== null && (leaf ? pht_node.is_leaf() : true)) {
        return pht_node;
      }
    }

    return null;
  } 

  // Find the PHT leaf node responsible for a given key, binary search edition
  // Returns null if there's no leaf node associated with that key
  async lookup_bin(key_str, leaf = true) {
    let p = 0;
    let r = Fpht.BIT_DEPTH - 1;

    while (p <= r) {
      let q = Math.floor((p + r) / 2);  
      const pht_node = await this._dht_lookup(key_str.substring(0, q));

      if (pht_node !== null && (leaf ? pht_node.is_leaf() : true)) {
        return pht_node;
      } else if (pht_node !== null && Fpht_node.valid_magic(pht_node)) {
        p = q + 1;
      } else {
        r = q - 1;
      } 
    }

    return null;
  }

  // Insert a (key, value) pair into the PHT
  async insert(key, val) {
    let leaf = await this.lookup_bin(key.to_bin_str(Fpht.BIT_DEPTH), true);

    if (leaf === null) {
      leaf = await this.lookup_lin(k.to_bin_str(Fpht.BIT_DEPTH), true);
    }

    // If we can't find the leaf node for a key, our graph is likely corrupted
    // TODO: disable this for production
    if (leaf === null) {
      throw new Error("Fatal PHT graph error");
    }

    if (leaf.get(key) || leaf.size() < Fpht.B) {
      leaf.put(key, val);
      const label_hash = this._get_label_hash(leaf.label);
      await this.dht_node.put.bind(this.dht_node)(label_hash, leaf);
      
      Flog.log(`[FPHT] Inserted key ${key.toString()} >> ${this.index_attr} leaf ${leaf.label} ` + 
        `(DHT key ${label_hash})`);
    } else {
      // This is the non-chad "unlimited split" version of bucket splitting
      // TODO: implement the "staggered updates" version
      const pairs = leaf.get_all_pairs().map(pair => 
        [new Fbigint(pair[0]), pair[1]]).concat([[key, val]]);

      const key_bin_strings = pairs.map(pair => pair[0].to_bin_str(Fpht.BIT_DEPTH));
      const i = Futil.get_lcp(key_bin_strings, true);

      // Our new child nodes must be 1 level deeper than the length of the lcp of all B + 1 keys
      let child0, child1;
      let old_leaf = leaf;
      let d = leaf.label.length; 

      while (d <= i) {
        child0 = new Fpht_node({label: `${old_leaf.label}0`});
        child1 = new Fpht_node({label: `${old_leaf.label}1`});

        Flog.log(`[FPHT] Splitting leaf ${old_leaf.label} into ${child0.label} + ${child1.label}`)

        child0.set_ptrs({left: old_leaf.ptr_left(), right: child1.get_label()});
        child1.set_ptrs({left: child0.get_label(), right: old_leaf.ptr_right()});

        const interior_node = new Fpht_node({label: old_leaf.label});
        interior_node.children[0x00] = child0.label;
        interior_node.children[0x01] = child1.label;

        // Reached our final depth? Then the children are leaf nodes, so distribute the keys to them
        if (d === i) {
          pairs.forEach((pair, idx, arr) => {
            // Sort them into the new children by their ith bit
            // TODO: It's brittle and noobish to use the parallel bin string array
            const child_ref = key_bin_strings[idx][i] === "0" ? child0 : child1;
            child_ref.put(pair[0], pair[1]);

            Flog.log(`[FPHT] Redistributed key ${pair[0].toString()} >> ${this.index_attr} ` + 
              `leaf ${child_ref.label} (DHT key ${this._get_label_hash(child_ref.label)})`);
          });
        }

        // PUT the new child leaf nodes and stomp the old leaf node, which is now an interior node
        // TODO: Alert the caller if any of the PUTs failed?
        await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child0.label), child0);
        await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(child1.label), child1);
        await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(interior_node.label), interior_node);

        // For the next iteration, old_leaf must be the child node from above that has the label 
        // equal to the lcp of the keys (or just the last digit of the longest common prefix, right?)
        old_leaf = child0.label[i - 1] === key_bin_strings[0][i - 1] ? child0 : child1;
        d += 1;
      }
    }

    this.rp_data.set(key.toString(), val);
    // TODO: return success/failure?
  }
  
  // Delete some data from the network
  async delete(key) {
    let leaf = await this.lookup_bin(key.to_bin_str(Fpht.BIT_DEPTH), true);

    if (leaf === null) {
      leaf = await this.lookup_lin(key.to_bin_str(Fpht.BIT_DEPTH), true);
    }

    // Key not found
    if (leaf === null) {
      return false;
    }

    // Key not found in the leaf node
    if (!leaf.delete(key)) {
      return;
    }

    const sibling_node = await this._dht_lookup(leaf.get_sibling_label());

    // If we can't find the sibling to a leaf node, our graph is likely corrupted
    // TODO: disable this for production
    if (sibling_node === null) {
      throw new Error("Fatal PHT graph error");
    }

    if (leaf.size() + sibling_node.size() > Fpht.B) {
      // Easy case: leaf + its sibling node contains more than B keys, so the invariant is maintained
      Flog.log(`[FPHT] Deleted key ${key.toString()} >> ${this.index_attr} leaf ` + 
        `${leaf.get_label()} (DHT key ${this._get_label_hash(leaf.get_label())})`);
    } else {
      // Hard case: leaf + its sibling nodes contain <= B keys, so we can do a merge 
      const pairs = leaf.get_all_pairs().concat(sibling_node.get_all_pairs()).map(pair => 
        [new Fbigint(pair[0]), pair[1]]);

      const key_bin_strings = pairs.map(pair => pair[0].to_bin_str(Fpht.BIT_DEPTH));

      // Our current depth = the length of our label
      let d = leaf.get_label().length;

      // Length of the longest common prefix of all keys between leaf and its sibling
      const i = Futil.get_lcp(key_bin_strings, true);

      let old_leaf = leaf;

      // TODO: d > 0 ensures that we don't delete our level zero (root) node, but is that necessary?
      while (d > 0 && d > i) {
        const parent_node = await this._dht_lookup(old_leaf.get_parent_label());

        if (parent_node === null) {
          throw new Error("Fatal PHT graph error");
        }

        parent_node.children[0x00] = null;
        parent_node.children[0x01] = null;

        // Fixing up our parent node's pointers
        // We need to know if our leaf is a 0 or a 1 node (0 node is "left", 1 node is "right")
        let child0, child1;

        if (old_leaf.get_label()[old_leaf.get_label().length - 1] === "0") {
          child0 = old_leaf;
          child1 = sibling_node;
        } else {
          child0 = sibling_node;
          child1 = old_leaf;
        }

        // Get the childrens' parent, get the left child's left neighbor, get the right child's 
        // right neighbor, set the left neighbor's right neighbor to parent, set the right 
        // neighbor's left neighbor to parent, no big deal

        const left_neighbor = await this._dht_lookup(child0.ptr_left());
        const right_neighbor = await this._dht_lookup(child1.ptr_right());

        // Neighbors can be null, that just means we reached the left or right terminus of the tree

        if (left_neighbor !== null) {
          left_neighbor.set_ptrs({left: left_neighbor.ptr_left(), right: parent_node.get_label()});
        }

        if (right_neighbor !== null) {
          right_neighbor.set_ptrs({left: parent_node.get_label(), right: right_neighbor.ptr_right()});
        }

        parent_node.set_ptrs({
          left: left_neighbor !== null ? left_neighbor.get_label() : null, 
          right: right_neighbor !== null ? right_neighbor.get_label() : null
        });

        // We've reached our final depth, so redistribute keys to the parent node
        if (d - i === 1) {
          pairs.forEach((pair, idx, arr) => {
            parent_node.put(pair[0], pair[1]);

            Flog.log(`[FPHT] Redistributed key ${pair[0].toString()} >> ${this.index_attr} leaf ` + 
              `${parent_node.get_label()} (DHT key ${this._get_label_hash(parent_node.get_label())})`);
          });
        }

        // PUT the new leaf node (the parent node) and its non-null right and left neighbors 
        // TODO: Alert the caller if any of the PUTs failed?
        await this.dht_node.put.bind(this.dht_node)(
          this._get_label_hash(parent_node.get_label()), 
          parent_node
        );

        if (left_neighbor !== null) {
          await this.dht_node.put.bind(this.dht_node)(
            this._get_label_hash(left_neighbor.get_label()), 
            left_neighbor
          );
        }

        if (right_neighbor !== null) {
          await this.dht_node.put.bind(this.dht_node)(
            this._get_label_hash(right_neighbor.get_label()), 
            right_neighbor
          );
        }

        // For the next iteration, old_leaf must be the parent
        old_leaf = parent_node;
        d -= 1;
      }
    }

    this.rp_data.delete(key.toString());
    // TODO: return success/failure?
  }

  // TODO: implement me
  async range_query_1d(minkey, maxkey) {

  }

  // Assumes that minkey and maxkey are both linearizations of some 2D data
  async range_query_2d(minkey, maxkey) {
    async function _do_range_query_2d(pht_node, data = []) {
      // Base case: it's a leaf node
      if (pht_node.is_leaf()) {
        const valid_pairs = pht_node.get_all_pairs().filter((pair) => {
          const zvalue = new Fbigint(pair[0]);
          const zvalue_2d = Futil.z_delinearize_2d(zvalue, Fpht.BIT_DEPTH / 2);
          
          return zvalue_2d.x.greater_equal(minkey_2d.x) && zvalue_2d.x.less(maxkey_2d.x) && 
            zvalue_2d.y.greater_equal(minkey_2d.y) && zvalue_2d.y.less(maxkey_2d.y);
        });

        return data.concat(valid_pairs);
      } 

      // Recursive case: it's an interior node
      // TODO: This needs to be parallelized, parallelization is the whole point of this algo, bro
      const subtree0 = `${pht_node.label}0`;
      const subtree1 = `${pht_node.label}1`;
      const subtree_0_zvalue = Fbigint.from_base2_str(subtree0);
      const subtree_1_zvalue = Fbigint.from_base2_str(subtree1);

      const subtree_0_2d = Futil.z_delinearize_2d(subtree_0_zvalue, Fpht.BIT_DEPTH / 2);
      const subtree_1_2d = Futil.z_delinearize_2d(subtree_1_zvalue, Fpht.BIT_DEPTH / 2);
      
      // subtree_0_zvalue and subtree_1_zvalue are essentially new minimum values representing a 
      // rectangular region for which we don't know the maximum value... i.e., they "anchor" a 
      // rectangular region which may have some overlay with the region defined by minkey and maxkey
      // see: https://en.wikipedia.org/wiki/Z-order_curve

      // So, does an anchored rectangle possibly overlap, depending on where its max value is?  
      // it's easy to figure out: ANCHOR_Z_VALUE's x value must be less than your max search x value
      // and ANCHOR_Z_VALUE's y value must be less than your max search y value
      // lat (x) is odd bits, long (y) is even bits

      if (subtree_0_2d.x.less(maxkey_2d.x) && subtree_0_2d.y.less(maxkey_2d.y)) {
        const child_node = await this._dht_lookup(subtree0);

        if (child_node === null) {
          throw new Error("Fatal PHT graph error");
        }

        data = await _do_range_query_2d.bind(this)(child_node, data);
      }

      if (subtree_1_2d.x.less(maxkey_2d.x) && subtree_1_2d.y.less(maxkey_2d.y)) {
        const child_node = await this._dht_lookup(subtree1);

        if (child_node === null) {
          throw new Error("Fatal PHT graph error");
        }

        data = await _do_range_query_2d.bind(this)(child_node, data);
      }

      return data;
    }

    // *** BEGIN ***
    if (!(minkey instanceof Fbigint) || !(maxkey instanceof Fbigint)) {
      throw new TypeError("Arguments 'minkey' and 'maxkey' must be Fbigint");
    }

    if (minkey.greater_equal(maxkey)) {
      throw new RangeError("'minkey' must be less than 'maxkey'");
    }

    const lcp = Futil.get_lcp([minkey.to_bin_str(Fpht.BIT_DEPTH), maxkey.to_bin_str(Fpht.BIT_DEPTH)]);
    const minkey_2d = Futil.z_delinearize_2d(minkey, Fpht.BIT_DEPTH / 2); 
    const maxkey_2d = Futil.z_delinearize_2d(maxkey, Fpht.BIT_DEPTH / 2); 

    // Find the node whose label corresponds to the smallest prefix range that completely covers the
    // specified range. In a perfect world, that would be a node whose label is equal to the lcp of
    // minkey and maxkey, but that node might not exist (because our trie is small, we don't have
    // much data, we have a big block size etc.)

    // TODO: this is the least understood aspect of the prefix hash tree, we may need to call
    // a Real Scientist™ at UC Berkeley

    let start_node = await this.lookup_bin(lcp, false);

    // Fall back to linear search, which will grab the root node
    if (start_node === null) {
      start_node = await this.lookup_lin(lcp, false);
    }

    if (start_node === null) {
      throw new Error("Fatal PHT graph error");
    }

    return await _do_range_query_2d.bind(this)(start_node);
  }
}

module.exports.Fpht = Fpht;