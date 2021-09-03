/** 
* FPHT
* Prefix hash tree built atop FKAD
* 
* 
*
*
*/ 

"use strict";

/*
* Never forget™:
* The longest binary prefix for two integers is based on the commonality of their high order bits.
* e.g. 7 and 4, interpreted as 8-bit integers 00000111 and 00000100, have an LCP of 000001.
* Pain awaits all who confuse their endianness.
*/

const { Fapp_cfg } = require("../fapp/fapp_cfg.js");
const cfg = require("../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Flog } = require("../flog/flog.js");
const { Futil } = require("../futil/futil.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js"); 
const { Fkad_data } = require("../fkad/fkad_data.js");
const { Fpht_node } = require("./fpht_node.js");

class Fpht {
  static BIT_DEPTH = 80;
  static B = 2;

  /**
   * index_attr: A unique string to identify the attribute we're indexing with this PHT interface
   * dht_node: reference to the DHT node associated with this PHT interface
   * dht_lookup_func: reference to the above node's lookup function
   * dht_ttl: TTL to inherit from the DHT
   * dht_lookup_args: args to pass the DHT lookup function to make it perform a value-based lookup
   */

  dht_node;
  dht_lookup_func;
  dht_lookup_args;
  index_attr;
  rp_data;
  ttl;
  refresh_interval;
  
  constructor({
    index_attr = null, 
    dht_node = null, 
    dht_lookup_func = null, 
    dht_ttl = null, 
    dht_lookup_args = []
  } = {}) {
    if (typeof index_attr !== "string") {
      throw new TypeError("Argument 'index_attr' must be a string");
    } 

    if (typeof dht_lookup_func !== "function") {
      throw new TypeError("Argument 'dht_lookup' must be a function");
    }

    if (typeof dht_ttl !== "number") {
      throw new TypeError("Argument 'dht_ttl' must be a number");

    }

    if (!Array.isArray(dht_lookup_args)) {
      throw new TypeError("Argument 'dht_lookup_args' must be an array");
    }
    
    this.dht_node = dht_node;
    this.dht_lookup_func = dht_lookup_func;
    this.dht_lookup_args = dht_lookup_args;
    this.ttl = Math.floor(dht_ttl / 2);
    this.index_attr = index_attr;
    this.rp_data = new Map();
    this.refresh_interval = null;
  }

  /**
   * Retrieve a PHT node by its label, returns null if not found
   */ 
  async _dht_lookup(label = "") {
    if (label === null) {
      return null;
    }

    const label_hash = this._get_label_hash(label);
    const res = await this.dht_lookup_func.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

    // TODO: This assumes that dht lookups always return an Fkad_data type, which is MAYBE true?
    const data = new Fkad_data(res);
    const payload = data.get_payload()[0];

    if (data.get_type() !== Fkad_data.TYPE.VAL || !Fpht_node.valid_magic(payload)) {
      return null;
    }
    
    return payload;
  }

  /**
   * Compute the hash of a PHT node label; pass no arg to get the label hash of the root node
   */ 
  _get_label_hash(data = "") {
    if (typeof data !== "string") {
      throw new TypeError("Argument 'data' must be string");
    }

    return new Fbigint(Fcrypto.sha1(`${this.index_attr}${data}`));
  }

  /**
   * Idempotently init a new PHT structure indexing on index_attr, kick off the refresh interval
   */ 
  async init() {
    this._init_intervals();
    Flog.log(`[FPHT] Key refresh interval: ${(this.ttl / 1000 / 60).toFixed(1)} minutes`);

    Flog.log(`[FPHT] Looking up root node for index attr ${this.index_attr}...`);
    const data = await this._dht_lookup();

    if (data !== null) {
      Flog.log(`[FPHT] Root node found! Created ${new Date(data.created)}`);
      return;
    }

    Flog.log(`[FPHT] No root node found! Creating new root for index attr ${this.index_attr}...`);
    const root = new Fpht_node({label: ""});
    const res = await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(), root);

    if (!res) {
      Flog.log(`[FPHT] WARNING! COULD NOT CREATE NEW ROOT FOR INDEX ATTR ${this.index_attr}!`);
    }
  }

  _init_intervals() {
    if (this.refresh_interval === null) {
      this.refresh_interval = setInterval(() => {
        const t1 = Date.now();

        // TODO: this has never been tested and is clearly nonworking, can't use async in a forEach
        this.rp_data.forEach(async (val, key) => {
          Flog.log(`[FPHT] Refreshing key ${key}`);
          const k = new Fbigint(key);
          await this.insert(k, val);

          let leaf = await this.lookup_bin(k.to_bin_str(Fpht.BIT_DEPTH));

          if (leaf === null) {
            leaf = await this.lookup_lin(k.to_bin_str(Fpht.BIT_DEPTH));
          }

          if (leaf === null) {
            throw new Error("Fatal PHT error");
          }

          let plabel = Fpht_node.get_parent_label(leaf);

          while (plabel !== null) {
            let parent = await this._dht_lookup(plabel);

            if (parent === null) {
              throw new Error("Fatal PHT error");
            }

            if (t1 > Fpht.get_created(parent) + this.ttl) {
              await this.dht_node.put.bind(this.dht_node)(
                this._get_label_hash(Fpht_node.get_label(parent)),
                parent
              );
            } else {
              break;
            }

            plabel = Fpht_node.get_parent_label(parent);
          }
        });
      }, this.ttl);
    }
  }

  /**
   * Find the PHT node responsible for a given key, linear search edition
   * Returns null if there's no node associated with that key
   */
  async lookup_lin(key_str) {
    for (let i = 0; i < key_str.length; i += 1) {
      const node = await this._dht_lookup(key_str.substring(0, i));
      
      if (node !== null && Fpht_node.is_leaf(node)) {
        return node;
      }
    }

    return null;
  } 

  /**
   * Find the PHT node responsible for a given key, binary search edition
   * Returns null if there's no node associated with that key
   */
  async lookup_bin(key_str) {
    let p = 0;
    let r = Fpht.BIT_DEPTH - 1;

    while (p <= r) {
      let q = Math.floor((p + r) / 2);  
      const node = await this._dht_lookup(key_str.substring(0, q));

      if (node !== null && Fpht_node.is_leaf(node)) {
        return node;
      } else if (node !== null && Fpht_node.valid_magic(node)) {
        p = q + 1;
      } else {
        r = q - 1;
      } 
    }

    return null;
  }

  async full_search(key) {
    let leaf = await this.lookup_bin(key.to_bin_str(Fpht.BIT_DEPTH));

    if (leaf === null) {
      leaf = await this.lookup_lin(key.to_bin_str(Fpht.BIT_DEPTH));
    }

    return leaf;
  }

  /**
   * Insert a (key, value) pair into the PHT
   */
  async insert(key, val) {
    const leaf = await this.full_search(key);

     /**
     * If we can't find the leaf node for a key, our trie is likely corrupted
     * TODO: disable this for production
     */
    if (leaf === null) {
      throw new Error("Fatal PHT error");
    }

    if (Fpht_node.get({node: leaf, key: key}) || Fpht_node.size(leaf) < Fpht.B) {
      /**
       * The easy case: if we're stomping a value or this insertion won't exceed block size,
       * just insert the value and be done
       */ 
      Fpht_node.put({node: leaf, key: key, val: val});
      const label_hash = this._get_label_hash(leaf.label);
      await this.dht_node.put.bind(this.dht_node)(label_hash, leaf);
      
      Flog.log(`[FPHT] Inserted key ${key.toString()} -> ${this.index_attr} ` +
        `${leaf.label.length > 0 ? leaf.label : "[root]"} (DHT key ${label_hash})`);
    } else {
      /**
       * The hard case: we have to split the bucket. This is the non-chad "unlimited split" version
       * of bucket splitting. TODO: implement the "staggered updates" version
       */
      const pairs = Fpht_node.get_all_pairs(leaf).map((pair) => {
        const [old_key, old_val] = pair;
        return [new Fbigint(old_key), old_val];
      }).concat([[key, val]]);

      const lcp = Futil.get_lcp(
        pairs.map((pair) => {
          const [new_key, new_val] = pair;
          return new_key.to_bin_str(Fpht.BIT_DEPTH);
        }),
        false
      );

      /**
       * Our new child nodes must be one level deeper than the length of the lcp of all B + 1 keys
       * (Don't forget the root node is d = 0)
       */ 
      let child_0, child_1;
      let old_leaf = leaf;
      let d = Fpht_node.get_label(leaf).length;

      while (d <= lcp.length) {
        child_0 = new Fpht_node({label: `${Fpht_node.get_label(old_leaf)}0`});
        child_1 = new Fpht_node({label: `${Fpht_node.get_label(old_leaf)}1`});

        Flog.log(`[FPHT] Split ${old_leaf.label.length > 0 ? old_leaf.label : "[root]"} ` +
          `-> ${Fpht_node.get_label(child_0)} + ${Fpht_node.get_label(child_1)}`)

        Fpht_node.set_ptrs({
          node: child_0, 
          left: Fpht_node.ptr_left(old_leaf), 
          right: Fpht_node.get_label(child_1)
        });
        
        Fpht_node.set_ptrs({
          node: child_1,
          left: Fpht_node.get_label(child_0),
          right: Fpht_node.ptr_right(old_leaf)
        });
        
        const int_node = new Fpht_node({
          label: Fpht_node.get_label(old_leaf), 
          child_0: Fpht_node.get_label(child_0),
          child_1: Fpht_node.get_label(child_1)
        });
        
        /**
         * Reached our final depth? Then the children are leaf nodes, so distribute the keys to them
         */ 
        if (d === lcp.length) {
          pairs.forEach((pair) => {
            const [new_key, new_val] = pair;

            /**
             * A [key, val] pair is distributed to the 0 or 1 child based on the bit that comes 
             * after the lcp computed over all the [key, val] pairs; e.g., for group of pairs 
             * with a lcp of 6 bits, the 6th bit (0-indexed) determines which child to sort to...
             */ 
            const dest = new_key.to_bin_str(Fpht.BIT_DEPTH)[lcp.length] === "0" ? child_0 : child_1;

            Fpht_node.put({
              node: dest,
              key: new_key,
              val: new_val
            });

            Flog.log(`[FPHT] Redistributed key ${new_key.toString()} -> ${this.index_attr} ` + 
              `${Fpht_node.get_label(dest)} (DHT key ${this._get_label_hash(Fpht_node.get_label(dest))})`);
          });
        }

        // TODO: Alert the caller if any of these PUTs fail?
        await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(Fpht_node.get_label(child_0)), child_0);
        await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(Fpht_node.get_label(child_1)), child_1);
        await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(Fpht_node.get_label(int_node)), int_node);

        /**
         * If we must iterate again, which branch do we follow downward? Well, of the two child
         * nodes we just created, we want to jump to the one with the label that has the longer 
         * common prefix of the lcp of all keys.
         */
        if (Futil.get_lcp([lcp, Fpht_node.get_label(child_0)], true) > 
          Futil.get_lcp([lcp, Fpht_node.get_label(child_1)], true)) {
          old_leaf = child_0;
        } else {
          old_leaf = child_1;
        }

        d += 1;
      }
    }

    this.rp_data.set(key.toString(), val);
  }
  
  // Delete some data from the network
  async delete(key) {
    const leaf = await this.full_search(key);

    // Key not found
    if (leaf === null) {
      return false;
    }

    // Key not found in the leaf node
    if (!Fpht_node.delete({node: leaf, key: key})) {
      return;
    }

    const sibling_node = await this._dht_lookup(Fpht_node.get_sibling_label(leaf));

    // If we can't find the sibling to a leaf node, our trie is likely corrupted
    // TODO: disable this for production
    if (sibling_node === null) {
      throw new Error("Fatal PHT error");
    }

    if (Fpht_node.size(leaf) + Fpht_node.size(sibling_node) > Fpht.B) {
      // Easy case: leaf + its sibling node contains more than B keys, so the invariant is maintained
      await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(leaf.label), leaf);

      Flog.log(`[FPHT] Deleted key ${key.toString()} -> ${this.index_attr} ` + 
        `${Fpht_node.get_label(leaf)} (DHT key ${this._get_label_hash(Fpht_node.get_label(leaf))})`);
    } else {
      // Hard case: leaf + its sibling nodes contain <= B keys, so we can do a merge 
      const pairs = Fpht_node.get_all_pairs(leaf).concat(Fpht_node.get_all_pairs(sibling_node)).map(pair => 
        [new Fbigint(pair[0]), pair[1]]);

      const key_bin_strings = pairs.map(pair => pair[0].to_bin_str(Fpht.BIT_DEPTH));

      // Our current depth = the length of our label
      let d = Fpht_node.get_label(leaf).length;

      // Length of the longest common prefix of all keys between leaf and its sibling
      const i = Futil.get_lcp(key_bin_strings, true);

      let old_leaf = leaf;

      // TODO: d > 0 ensures that we don't delete our level zero (root) node, but is that necessary?
      while (d > 0 && d > i) {
        const parent_node = await this._dht_lookup(Fpht_node.get_parent_label(old_leaf));

        if (parent_node === null) {
          throw new Error("Fatal PHT error");
        }

        parent_node.children[0x00] = null;
        parent_node.children[0x01] = null;

        // Fixing up our parent node's pointers
        // We need to know if our leaf is a 0 or a 1 node (0 node is "left", 1 node is "right")
        let child_0, child_1;

        if (Fpht_node.get_label(old_leaf)[Fpht_node.get_label(old_leaf).length - 1] === "0") {
          child_0 = old_leaf;
          child_1 = sibling_node;
        } else {
          child_0 = sibling_node;
          child_1 = old_leaf;
        }

        // Get the childrens' parent, get the left child's left neighbor, get the right child's 
        // right neighbor, set the left neighbor's right neighbor to parent, set the right 
        // neighbor's left neighbor to parent, no big deal

        const left_neighbor = await this._dht_lookup(Fpht_node.ptr_left(child_0));
        const right_neighbor = await this._dht_lookup(Fpht_node.ptr_right(child_1));

        // Neighbors can be null, that just means we reached the left or right terminus of the tree

        if (left_neighbor !== null) {
          Fpht_node.set_ptrs({
            node: left_neighbor, 
            left: Fpht_node.ptr_left(left_neighbor), 
            right: Fpht_node.get_label(parent_node)
          });
        }

        if (right_neighbor !== null) {
          Fpht_node.set_ptrs({
            node: right_neighbor, 
            left: Fpht_node.get_label(parent_node),
            right: Fpht_node.ptr_right(right_neighbor)
          });
        }

        Fpht_node.set_ptrs({
          node: parent_node, 
          left: left_neighbor !== null ? Fpht_node.get_label(left_neighbor) : null, 
          right: right_neighbor !== null ? Fpht_node.get_label(right_neighbor) : null
        });

        // We've reached our final depth, so redistribute keys to the parent node
        if (d - i === 1) {
          pairs.forEach((pair, idx, arr) => {
            Fpht_node.put({node: parent_node, key: pair[0], val: pair[1]});
            
            Flog.log(`[FPHT] Redistributed key ${pair[0].toString()} -> ${this.index_attr} ` + 
              `${Fpht_node.get_label(parent_node)} (DHT key ` + 
                `${this._get_label_hash(Fpht_node.get_label(parent_node))})`);
          });
        }

        // PUT the new leaf node (the parent node) and its non-null right and left neighbors 
        // TODO: Alert the caller if any of the PUTs failed?
        await this.dht_node.put.bind(this.dht_node)(
          this._get_label_hash(Fpht_node.get_label(parent_node)), 
          parent_node
        );

        if (left_neighbor !== null) {
          await this.dht_node.put.bind(this.dht_node)(
            this._get_label_hash(Fpht_node.get_label(left_neighbor)), 
            left_neighbor
          );
        }

        if (right_neighbor !== null) {
          await this.dht_node.put.bind(this.dht_node)(
            this._get_label_hash(Fpht_node.get_label(right_neighbor)), 
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
      if (Fpht_node.is_leaf(pht_node)) {
        const valid_pairs = Fpht_node.get_all_pairs(pht_node).filter((pair) => {
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
          throw new Error("Fatal PHT error");
        }

        data = await _do_range_query_2d.bind(this)(child_node, data);
      }

      if (subtree_1_2d.x.less(maxkey_2d.x) && subtree_1_2d.y.less(maxkey_2d.y)) {
        const child_node = await this._dht_lookup(subtree1);

        if (child_node === null) {
          throw new Error("Fatal PHT error");
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

    /*
    * The range query search process follows the following idea: 
    * If the values in the specified range are distributed among many leaf nodes, then an interior
    * node corresponding to the LCP should exist, so we can jump to it with one DHT lookup. This
    * interior node is the nearest common ancestor which minimally encompasses our search range,
    * so we begin our traversal there. Conversely, if the values in the specified range are 
    * held in just one leaf node, then we should be able to find that leaf node using the 
    * binary/linear search fallback method.
    */

    let start_node = await this._dht_lookup(lcp);

    if (start_node === null) {
      start_node = await this.full_search(lcp);
    }

    if (start_node === null) {
      throw new Error("Fatal PHT error");
    }

    return await _do_range_query_2d.bind(this)(start_node);
  }
}

module.exports.Fpht = Fpht;