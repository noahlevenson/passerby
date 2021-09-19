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
const { Fpht_key } = require("./fpht_key.js");

class Fpht {
  static BIT_DEPTH = 80;
  static B = 2;

  /**
   * index_attr: A unique string to identify the attribute we're indexing with this PHT interface
   * dht_node: reference to the DHT node associated with this PHT interface
   * dht_lookup_func: reference to the above node's lookup function
   * dht_lookup_args: args to pass the DHT lookup function to make it perform a value-based lookup
   */

  dht_node;
  dht_lookup_func;
  dht_lookup_args;
  index_attr;
  
  constructor({
    dht_node = null, 
    dht_lookup_func = null, 
    dht_lookup_args = [],
    index_attr = null, 
  } = {}) {
    if (typeof index_attr !== "string") {
      throw new TypeError("Argument 'index_attr' must be a string");
    } 

    if (typeof dht_lookup_func !== "function") {
      throw new TypeError("Argument 'dht_lookup' must be a function");
    }
  
    this.dht_node = dht_node;
    this.dht_lookup_func = dht_lookup_func;
    this.dht_lookup_args = dht_lookup_args;
    this.index_attr = index_attr;
  }

  /**
   * Retrieve a PHT node by its label, returns null if not found
   */ 
  async _dht_lookup(label = "") {
    if (label === null) {
      return null;
    }

    const label_hash = this._get_label_hash(label);
    const data = await this.dht_lookup_func.bind(this.dht_node)(label_hash, ...this.dht_lookup_args);

    // TODO: This assumes that dht lookups always return an Fkad_data type, which is MAYBE true?
    const payload = Fkad_data.get_payload(data)[0];
  
    if (Fkad_data.get_type(data) !== Fkad_data.TYPE.VAL || !Fpht_node.valid_magic(payload)) {
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
   * Search the network for the root node we expect for index_attr. If we fail to find the root node
   * and create = false, we'll throw an error; if create = true, we'll try to create the root node.
   */ 
  async init(create = false) {
    Flog.log(`[FPHT] Looking up root node for index attr ${this.index_attr}...`);
    const data = await this._dht_lookup();

    if (data !== null) {
      Flog.log(`[FPHT] Root node found! DHT key ${this._get_label_hash()}`);
      return;
    }

    Flog.log(`[FPHT] No root node found!`);

    if (!create) {
      throw new Error(`Could not locate root node for index attr ${this.index_attr}!`);
    }

    Flog.log(`[FPHT] Creating new root node for index attr ${this.index_attr}...`);
    const root = new Fpht_node({label: ""});
    const res = await this.dht_node.put.bind(this.dht_node)(this._get_label_hash(), root);
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

  async full_search(fpht_key) {
    const key_str = Fpht_key.get_integral(fpht_key).to_bin_str(Fpht.BIT_DEPTH);
    let leaf = await this.lookup_bin(key_str);

    if (leaf === null) {
      leaf = await this.lookup_lin(key_str);
    }

    return leaf;
  }

  async _do_split_insert({pairs, lcp, depth, leaf} = {}) {
    async function _publish(child_0, child_1, int_node) {
      // TODO: Alert the caller if any of these PUTs fail?
      await this.dht_node.put.bind(this.dht_node)(
        this._get_label_hash(Fpht_node.get_label(child_0)), 
        new Fpht_node(child_0)
      );
        
      await this.dht_node.put.bind(this.dht_node)(
        this._get_label_hash(Fpht_node.get_label(child_1)), 
        new Fpht_node(child_1)
      );
      
      await this.dht_node.put.bind(this.dht_node)(
        this._get_label_hash(Fpht_node.get_label(int_node)), 
        new Fpht_node(int_node)
      );
    }

    const child_0 = new Fpht_node({label: `${Fpht_node.get_label(leaf)}0`});
    const child_1 = new Fpht_node({label: `${Fpht_node.get_label(leaf)}1`});

    Flog.log(`[FPHT] Split ${Fpht_node.get_label(leaf).length > 0 ? Fpht_node.get_label(leaf) : "[root]"} -> `
      + `${Fpht_node.get_label(child_0)} + ${Fpht_node.get_label(child_1)}`);

    Fpht_node.set_ptrs({
      node: child_0, 
      left: Fpht_node.ptr_left(leaf), 
      right: Fpht_node.get_label(child_1)
    });
    
    Fpht_node.set_ptrs({
      node: child_1,
      left: Fpht_node.get_label(child_0),
      right: Fpht_node.ptr_right(leaf)
    });
    
    const int_node = new Fpht_node({
      label: Fpht_node.get_label(leaf), 
      child_0: Fpht_node.get_label(child_0),
      child_1: Fpht_node.get_label(child_1)
    });

    if (depth === lcp.length) {
      /**
       * Base case: we've reached our final depth. The children are leaf nodes, so distribute the 
       * keys to them
       */ 
      pairs.forEach((pair) => {
        const [fpht_key, val] = pair;

        /**
         * A [fpht_key, val] pair is distributed to the 0 or 1 child based on the bit that comes 
         * after the lcp computed over all the [key, val] pairs; e.g., for group of pairs 
         * with a lcp of 6 bits, the 6th bit (0-indexed) determines which child to sort to...
         */
        const dest = Fpht_key.get_integral(fpht_key).to_bin_str(Fpht.BIT_DEPTH)[lcp.length] === "0" ? 
          child_0 : child_1;

        Fpht_node.put({
          node: dest,
          fpht_key: fpht_key,
          val: val
        });

        Flog.log(`[FPHT] Redistributed key ${Fpht_key.get_integral(fpht_key)} (integral) -> ${this.index_attr} ` + 
          `${Fpht_node.get_label(dest)} (DHT key ${this._get_label_hash(Fpht_node.get_label(dest))})`);
      });

      await _publish.bind(this)(child_0, child_1, int_node);
    } else {
      /**
       * Recursive case: which branch do we follow downward? Well, of the two child
       * nodes we just created, we want to jump to the one with the label that has the longer 
       * common prefix of the lcp of all keys.
       */
      await _publish.bind(this)(child_0, child_1, int_node);
      const next_node = Futil.get_lcp([lcp, Fpht_node.get_label(child_0)]).length > 
        Futil.get_lcp([lcp, Fpht_node.get_label(child_1)]).length ? child_0 : child_1;
      await this._do_split_insert({pairs: pairs, lcp: lcp, depth: depth + 1, leaf: next_node});
    }
  }
  
  /**
   * Insert a (fpht_key, value) pair into the PHT
   */
  async insert(fpht_key, val) {
    const leaf = await this.full_search(fpht_key);

     /**
     * If we can't find the leaf node for a key, our trie is likely corrupted
     * TODO: disable this for production
     */
    if (leaf === null) {
      throw new Error("Fatal PHT error");
    }

    if (Fpht_node.get({node: leaf, fpht_key: fpht_key}) || Fpht_node.size(leaf) < Fpht.B) {
      /**
       * The easy case: if we're stomping a value or this insertion won't exceed block size,
       * just insert the value in a new Fpht_node to update the created time.
       */ 
      Fpht_node.put({node: leaf, fpht_key: fpht_key, val: val});

      const res = await this.dht_node.put.bind(this.dht_node)(
        this._get_label_hash(Fpht_node.get_label(leaf)), 
        new Fpht_node(leaf)
      );
    } else {
      /**
       * The hard case: we have to split the bucket. This is the non-chad "unlimited split" version
       * of bucket splitting. TODO: implement the "staggered updates" version
       */
      const pairs = Fpht_node.get_all_pairs(leaf).map((pair) => {
        const [old_key, old_val] = pair;
        return [Fpht_key.from(old_key), old_val];
      }).concat([[fpht_key, val]]);

      const lcp = Futil.get_lcp(
        pairs.map((pair) => {
          const [new_key, new_val] = pair;
          return Fpht_key.get_integral(new_key).to_bin_str(Fpht.BIT_DEPTH);
        })
      );

      await this._do_split_insert({
        pairs: pairs, 
        lcp: lcp, 
        depth: Fpht_node.get_label(leaf).length,
        leaf: leaf
      });
    }

    Flog.log(`[FPHT] Inserted key ${Fpht_key.get_integral(fpht_key).toString()} (integral) -> ` + 
      `${this.index_attr} ${Fpht_node.get_label(leaf).length > 0 ? Fpht_node.get_label(leaf) : "[root]"} ` +
        `(DHT key ${this._get_label_hash(Fpht_node.get_label(leaf))})`);
  }

  async _do_merge_delete({pairs, leaf, sib} = {}) {
    async function _publish(parent, leaf, l_nbr, r_nbr) {
      // TODO: Alert the caller if any of these PUTs fail?
      await this.dht_node.put.bind(this.dht_node)(
        this._get_label_hash(Fpht_node.get_label(parent)), 
        parent
      );

      // Immediately delete the leaf node from the topology
      await this.dht_node.put.bind(this.dht_node)(
        this._get_label_hash(Fpht_node.get_label(leaf)),
        null
      );

      if (l_nbr !== null) {
        Fpht_node.set_ptrs({
          node: l_nbr, 
          left: Fpht_node.ptr_left(l_nbr), 
          right: Fpht_node.get_label(parent)
        });

        await this.dht_node.put.bind(this.dht_node)(
          this._get_label_hash(Fpht_node.get_label(l_nbr)), 
          l_nbr
        );
      }

      if (r_nbr !== null) {
        Fpht_node.set_ptrs({
          node: r_nbr, 
          left: Fpht_node.get_label(parent),
          right: Fpht_node.ptr_right(r_nbr)
        });

        await this.dht_node.put.bind(this.dht_node)(
          this._get_label_hash(Fpht_node.get_label(r_nbr)), 
          r_nbr
        );
      }
    }

    const parent = await this._dht_lookup(Fpht_node.get_parent_label(leaf));

    /**
     * If we can't find the parent node, our trie is likely corrupted
     * TODO: disable this for production
     */
    if (parent === null) {
      throw new Error("Fatal PHT error");
    }

    /**
     * Parent node becomes a leaf node...
     */
    Fpht_node.set_children({node: parent, child_0: null, child_1: null});

    /**
     * Now we must update the parent node's pointers. If the former leaf node was a 0 node,
     * then the parent node's left neighbor is the left neighbor of the former leaf node; if
     * the former leaf node was a 1 node, then the parent node's left neighbor is the sibling of
     * the former leaf node. This is inverted for the right neighbor.
     */  
    const l_nbr = await this._dht_lookup(
      Fpht_node.ptr_left(Fpht_node.get_label(leaf)[Fpht_node.get_label(leaf).length - 1] === "0" ? leaf : sib)
    );

    const r_nbr = await this._dht_lookup(
      Fpht_node.ptr_right(Fpht_node.get_label(leaf)[Fpht_node.get_label(leaf).length - 1] === "1" ? leaf : sib)
    );

    Fpht_node.set_ptrs({
      node: parent, 
      left: l_nbr !== null ? Fpht_node.get_label(l_nbr) : null, 
      right: r_nbr !== null ? Fpht_node.get_label(r_nbr) : null
    });

    /**
     * (Since the neighbors might be null [at the left/right terminus of the trie], we'll determine
     * whether to update their pointers when we _publish() the nodes from this round)
     */

    /**
     * Base case: we've reached our final depth, either because the parent node is the root node or
     * because the sum of keys destined for the parent and its sibling now maintain the invariant. 
     * So let's distribute our keys to this parent...
     */
    const parent_sib = await this._dht_lookup(Fpht_node.get_sibling_label(parent));

    if (parent_sib === null || pairs.length + Fpht_node.size(parent_sib) > Fpht.B) {
      pairs.forEach((pair) => {
        const [key, val] = pair;
        Fpht_node.put({node: parent, fpht_key: key, val: val});  
        Flog.log(`[FPHT] Redistributed key ${Fpht_key.get_integral(key)} (integral) -> ${this.index_attr} ` + 
          `${Fpht_node.get_label(parent)} (DHT key ` + 
            `${this._get_label_hash(Fpht_node.get_label(parent))})`);
      });

      await _publish.bind(this)(parent, leaf, l_nbr, r_nbr);
    } else {
      /**
       * Recursive case: we jump to the parent
       */
      await _publish.bind(this)(parent, leaf, l_nbr, r_nbr);
      
      await this._do_merge_delete({
        pairs: pairs,
        leaf: parent, 
        sib: parent_sib
      });
    }
  }
  
  /**
   * Delete a key from the PHT
   */
  async delete(fpht_key) {
    const leaf = await this.full_search(fpht_key);

    /**
     * If we can't find the leaf node for a key, our trie is likely corrupted
     * TODO: disable this for production
     */
    if (leaf === null) {
      throw new Error("Fatal PHT error");
    }

    const res = Fpht_node.delete({node: leaf, fpht_key: fpht_key});

    /**
     * The data you want to delete doesn't exist
     */ 
    if (!res) {
      return;
    }

    const sib = await this._dht_lookup(Fpht_node.get_sibling_label(leaf));

    if (sib === null || Fpht_node.size(leaf) + Fpht_node.size(sib) > Fpht.B) {
      /**
       * The easy case: the data was found in the root node, so there's no possibility of a merge...
       * or, more likely, leaf + its sibling contain more than B keys, so the invariant is maintained
       */ 
      await this.dht_node.put.bind(this.dht_node)(
        this._get_label_hash(Fpht_node.get_label(leaf)), 
        leaf
      );
    } else {
      /**
       * The hard case: leaf + its sibling contain <= B keys, so we must perform a merge
       */ 
      const pairs = Fpht_node.get_all_pairs(leaf).concat(Fpht_node.get_all_pairs(sib)).map((pair) => {
        const [key, val] = pair;
        return [Fpht_key.from(key), val];
      });

      await this._do_merge_delete({
        pairs: pairs,
        leaf: leaf,
        sib: sib
      });
    }

    Flog.log(`[FPHT] Deleted key ${Fpht_key.get_integral(fpht_key)} (integral) -> ${this.index_attr} ` + 
        `${Fpht_node.get_label(leaf)} (DHT key ${this._get_label_hash(Fpht_node.get_label(leaf))})`);
  }

  async _do_range_query_2d({pht_node, minkey_2d, maxkey_2d, data = []} = {}) {
    /**
     * Base case: it's a leaf node
     */ 
    if (Fpht_node.is_leaf(pht_node)) {
      const valid_pairs = Fpht_node.get_all_pairs(pht_node).filter((pair) => {
        const [key, val] = pair;
        const zvalue = Fpht_key.get_integral(Fpht_key.from(key));
        const zvalue_2d = Futil.z_delinearize_2d(zvalue, Fpht.BIT_DEPTH / 2);
        return zvalue_2d.x.greater_equal(minkey_2d.x) && zvalue_2d.x.less(maxkey_2d.x) && 
          zvalue_2d.y.greater_equal(minkey_2d.y) && zvalue_2d.y.less(maxkey_2d.y);
      });

      return data.concat(valid_pairs);
    } 

    /**
     * Recursive case: it's an internal node. TODO: this must be parallelized
     */ 
    const subtree_0 = `${pht_node.label}0`;
    const subtree_1 = `${pht_node.label}1`;
    const subtree_0_zvalue = Fbigint.from_base2_str(subtree_0);
    const subtree_1_zvalue = Fbigint.from_base2_str(subtree_1);
    const subtree_0_2d = Futil.z_delinearize_2d(subtree_0_zvalue, Fpht.BIT_DEPTH / 2);
    const subtree_1_2d = Futil.z_delinearize_2d(subtree_1_zvalue, Fpht.BIT_DEPTH / 2);
    
    /**
     * subtree_0_zvalue and subtree_1_zvalue are essentially new minimum values representing a 
     * rectangular region for which we don't know the maximum value... i.e., they "anchor" a 
     * rectangular region which may have some overlap with the region defined by minkey and maxkey
     * see: https://en.wikipedia.org/wiki/Z-order_curve
     * 
     * So, does an anchored rectangle possibly overlap, depending on where its max value is?  
     * It's easy to figure out: ANCHOR_Z_VALUE's x value must be less than your max search x value
     * and ANCHOR_Z_VALUE's y value must be less than your max search y value
     * lat (x) is odd bits, long (y) is even bits
     */ 
    if (subtree_0_2d.x.less(maxkey_2d.x) && subtree_0_2d.y.less(maxkey_2d.y)) {
      const child_node = await this._dht_lookup(subtree_0);

      if (child_node === null) {
        throw new Error("Fatal PHT error");
      }

      data = await this._do_range_query_2d.bind(this)({
        pht_node: child_node,
        minkey_2d: minkey_2d,
        maxkey_2d: maxkey_2d,
        data: data
      });
    }

    if (subtree_1_2d.x.less(maxkey_2d.x) && subtree_1_2d.y.less(maxkey_2d.y)) {
      const child_node = await this._dht_lookup(subtree_1);

      if (child_node === null) {
        throw new Error("Fatal PHT error");
      }

      data = await this._do_range_query_2d.bind(this)({
        pht_node: child_node,
        minkey_2d: minkey_2d,
        maxkey_2d: maxkey_2d,
        data: data
      });
    }

    return data;
  }

  /**
   * 2D range query, where minkey and maxkey are 2D values mapped to one dimension using a Morton
   * order curve. Note a distinction here: PHT update operations require an Fpht_key because data
   * is stored to the network under a serialized Fpht_key, but 2D range query takes Fbigints because
   * range queries are concerned only with the integral parts of Fpht_keys.
   */ 
  async range_query_2d(minkey, maxkey) {
    if (!(minkey instanceof Fbigint) || !(maxkey instanceof Fbigint)) {
      throw new TypeError("Arguments 'minkey' and 'maxkey' must be Fbigint");
    }

    if (minkey.greater_equal(maxkey)) {
      throw new RangeError("'maxkey' must be greater than 'minkey'");
    }

    /*
    * The range query search process follows the following idea: 
    * If the values in the specified range are distributed among many leaf nodes, then an interior
    * node corresponding to the LCP should exist, so we can jump to it with one DHT lookup. This
    * interior node is the nearest common ancestor which minimally encompasses our search range,
    * so we begin our traversal there. Conversely, if the values in the specified range are 
    * held in just one leaf node, then we should be able to find that leaf node using the 
    * binary/linear search fallback method.
    */
    const lcp = Futil.get_lcp([minkey.to_bin_str(Fpht.BIT_DEPTH), maxkey.to_bin_str(Fpht.BIT_DEPTH)]);
    let start = await this._dht_lookup(lcp);

    if (start === null) {
      start = await this.full_search(new Fpht_key({integral: Fbigint.from_base2_str(lcp)}));
    }

    /**
     * If we can't find a start node, our trie is likely corrupted
     * TODO: disable this for production
     */
    if (start === null) {
      throw new Error("Fatal PHT error");
    }
  
    return await this._do_range_query_2d.bind(this)({
      pht_node: start,
      minkey_2d: Futil.z_delinearize_2d(minkey, Fpht.BIT_DEPTH / 2),
      maxkey_2d: Futil.z_delinearize_2d(maxkey, Fpht.BIT_DEPTH / 2)
    });
  }
}

module.exports.Fpht = Fpht;