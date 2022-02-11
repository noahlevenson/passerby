"use strict";

const { Bigboy } = require("../core/types/bigboy.js");
const { get_lcp, morton_invert_2d } = require("../core/math.js");
const { to_hex, generic_hash } = require("../core/crypto.js");
const { BIT_DOMAIN, get_integral, from_str } = require("./key.js");
const { node, valid_magic, is_leaf, get_label, get_sibling_label, set_ptrs, set_children, ptr_left, 
  ptr_right, put, get, del, size, get_all_pairs, get_parent_label } = require("./node.js");
const Journal = require("../core/journal.js");

/*
* Never forget™:
* The longest binary prefix for two integers is based on the commonality of their high order bits.
* e.g. 7 and 4, interpreted as 8-bit integers 00000111 and 00000100, have an LCP of 000001.
* Pain awaits all who confuse their endianness.
*/

class Pht {
  static TAG = "TRIE";
  static B = 2;
  static HASH_LEN = 32;

  constructor(db, index = "DEFAULT_ATTRIBUTE") {
    this.db = db;
    this.index = index;
  }

   /**
   * Retrieve a PHT node by its label, returns null if not found. TODO: This assumes that Db.read 
   * simply returns the value on success, or null on failure. We also check the magic cookie here
   * just to make sure someone hasn't been putting stuff where it doesn't belong on the DHT, though
   * this is prob unnecessary...
   */ 
  async dht_lookup(label = "") {
    const key = this.get_label_hash(label);
    const data = await this.db.read(key);

    if (!valid_magic(data)) {
      return null;
    }

    return data;
  }

  /**
   * Compute the hash of a PHT node label; pass no arg to get the label hash of the root node
   */ 
  get_label_hash(data = "") {
    return Bigboy.from_hex_str({
      len: Pht.HASH_LEN, str: to_hex(generic_hash(Pht.HASH_LEN, `${this.index}${data}`))
    });
  }

  /**
   * Search the network for the root node we expect for this.index. If we fail to find the root node
   * and create = false, we'll throw an error; if create = true, we'll try to create the root node.
   */ 
  async init(create = false) {
    Journal.log(Pht.TAG, `Looking up root node for index ${this.index}...`);
    const data = await this.dht_lookup();

    if (data !== null) {
      Journal.log(Pht.TAG, `Root node found! DHT key ${this.get_label_hash().to_hex_str()}`);
      return;
    }

    Journal.log(Pht.TAG, `No root node found!`);

    if (!create) {
      throw new Error(`Could not locate root node for index ${this.index}!`);
    }

    Journal.log(Pht.TAG, `Creating new root node for index ${this.index}...`);
    await this.db.write(this.get_label_hash(), node());
  }

  /**
   * Find the PHT node responsible for a given key, linear search edition
   * Returns null if there's no node associated with that key
   */
  async lookup_lin(key_str) {
    for (let i = 0; i < key_str.length; i += 1) {
      const node = await this.dht_lookup(key_str.substring(0, i));
      
      if (node !== null && is_leaf(node)) {
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
    let r = BIT_DOMAIN - 1;

    while (p <= r) {
      let q = Math.floor((p + r) / 2);  
      const node = await this.dht_lookup(key_str.substring(0, q));

      if (node !== null && is_leaf(node)) {
        return node;
      } else if (node !== null && valid_magic(node)) {
        p = q + 1;
      } else {
        r = q - 1;
      } 
    }

    return null;
  }

  /**
   * Find the PHT node responsible for a given key, first trying binary search and then falling back 
   * to linear search. The spec uses this method in two subtly different ways: in one instance, it's
   * used to find the PHT node responsible for an N-bit PHT key, where N is fixed and equal to 
   * BIT_DOMAIN. In the other instance, it's used to find the PHT node which is the nearest common 
   * ancestor to a set of leaf nodes representing a search range described by the longest common 
   * binary prefix of a minimum and maximum value. Since the job of the PHT is to interpret values as 
   * binary strings, we clearly have two cases for the handling of such strings: If the binary string 
   * represents an N-bit PHT key, we should zero-pad the high order bits such that the length of the 
   * string equals BIT_DOMAIN. However, if the binary string represents a longest common prefix, we 
   * must leave the string as-is to preserve the high order leading zero bits. To manage this 
   * complexity, full_search() assumes that 'key_str' is a perfect representation of whatever you're 
   * searching for -- i.e., the caller must be sure to correctly transform their PHT keys or LCPs to 
   * binary strings using the appropriate method!
   */
  async full_search(key_str) {
    let leaf = await this.lookup_bin(key_str);

    if (leaf === null) {
      leaf = await this.lookup_lin(key_str);
    }

    return leaf;
  }

  async _do_split_insert({pairs, lcp, depth, leaf} = {}) {
    async function _publish(child_0, child_1, int_node) {
      // TODO: Alert the caller if any of these PUTs fail?
      await this.db.write(this.get_label_hash(get_label(child_0)), node(child_0));
      await this.db.write(this.get_label_hash(get_label(child_1)), node(child_1));
      await this.db.write(this.get_label_hash(get_label(int_node)), node(int_node));
    }

    const child_0 = node({label: `${get_label(leaf)}0`});
    const child_1 = node({label: `${get_label(leaf)}1`});

    Journal.log(Pht.TAG, `Split ${get_label(leaf).length > 0 ? get_label(leaf) : "[root]"} -> `
      + `${get_label(child_0)} + ${get_label(child_1)}`);

    set_ptrs({node: child_0, left: ptr_left(leaf), right: get_label(child_1)});
    set_ptrs({node: child_1, left: get_label(child_0), right: ptr_right(leaf)});
    
    const int_node = node({
      label: get_label(leaf), 
      child_0: get_label(child_0), 
      child_1: get_label(child_1)
    });

    if (depth === lcp.length) {
      /**
       * Base case: we've reached our final depth. The children are leaf nodes, so distribute the 
       * keys to them
       */ 
      pairs.forEach((pair) => {
        const [key, val] = pair;

        /**
         * A [key, val] pair is distributed to the 0 or 1 child based on the bit that comes 
         * after the lcp computed over all the [key, val] pairs; e.g., for group of pairs 
         * with a lcp of 6 bits, the 6th bit (0-indexed) determines which child to sort to...
         */
        const dest = get_integral(key).to_base2_str()[lcp.length] === "0" ? child_0 : child_1;
        put({node: dest, key: key, val: val});

        Journal.log(Pht.TAG, `Redistributed key ${get_integral(key)} (integral) -> ${this.index} ` + 
          `${get_label(dest)} (DHT key ${this.get_label_hash(get_label(dest)).to_hex_str()})`);
      });

      await _publish.bind(this)(child_0, child_1, int_node);
    } else {
      /**
       * Recursive case: which branch do we follow downward? Well, of the two child
       * nodes we just created, we want to jump to the one with the label that has the longer 
       * common prefix of the lcp of all keys.
       */
      await _publish.bind(this)(child_0, child_1, int_node);
      const next_node = get_lcp([lcp, get_label(child_0)]).length > 
        get_lcp([lcp, get_label(child_1)]).length ? child_0 : child_1;
      await this._do_split_insert({pairs: pairs, lcp: lcp, depth: depth + 1, leaf: next_node});
    }
  }

  /**
   * Insert a (key, value) pair into the PHT
   */
  async insert(key, val) {
    const key_str = get_integral(key).to_base2_str();
    const leaf = await this.full_search(key_str);

     /**
     * If we can't find the leaf node for a key, our trie is likely corrupted
     * TODO: disable this for production
     */
    if (leaf === null) {
      throw new Error("Fatal PHT error");
    }

    if (get({node: leaf, key: key}) || size(leaf) < Pht.B) {
      /**
       * The easy case: if we're stomping a value or this insertion won't exceed block size,
       * just insert the value in a new Fpht_node to update the created time.
       */ 
      put({node: leaf, key: key, val: val});
      await this.db.write(this.get_label_hash(get_label(leaf)), node(leaf));
    } else {
      /**
       * The hard case: we have to split the bucket. This is the non-chad "unlimited split" version
       * of bucket splitting. TODO: implement the "staggered updates" version
       */
      const pairs = get_all_pairs(leaf).map((pair) => {
        const [old_key, old_val] = pair;
        return [from_str(old_key), old_val];
      }).concat([[key, val]]);

      const lcp = get_lcp(
        pairs.map((pair) => {
          const [new_key, new_val] = pair;
          return get_integral(new_key).to_base2_str()
        })
      );

      await this._do_split_insert({
        pairs: pairs, 
        lcp: lcp, 
        depth: get_label(leaf).length,
        leaf: leaf
      });
    }

    Journal.log(Pht.TAG, `Inserted key ${get_integral(key).to_hex_str()} (integral) -> ` + 
      `${this.index} ${get_label(leaf).length > 0 ? get_label(leaf) : "[root]"} ` +
        `(DHT key ${this.get_label_hash(get_label(leaf)).to_hex_str()})`);
  }

  async _do_merge_delete({pairs, leaf, sib} = {}) {
    async function _publish(parent, leaf, l_nbr, r_nbr) {
      // TODO: Alert the caller if any of these PUTs fail?
      await this.db.write(this.get_label_hash(get_label(parent)), parent);

      // Immediately delete the leaf node from the topology
      await this.db.write(this.get_label_hash(get_label(leaf)), null);

      if (l_nbr !== null) {
        set_ptrs({node: l_nbr, left: ptr_left(l_nbr), right: get_label(parent)});
        await this.db.write(this.get_label_hash(get_label(l_nbr)), l_nbr);
      }

      if (r_nbr !== null) {
        set_ptrs({node: r_nbr, left: get_label(parent), right: ptr_right(r_nbr)});
        await this.db.write(this.get_label_hash(r_nbr), r_nbr);
      }
    }

    const parent = await this.dht_lookup(get_parent_label(leaf));

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
    set_children({node: parent, child_0: null, child_1: null});

    /**
     * Now we must update the parent node's pointers. If the former leaf node was a 0 node,
     * then the parent node's left neighbor is the left neighbor of the former leaf node; if
     * the former leaf node was a 1 node, then the parent node's left neighbor is the sibling of
     * the former leaf node. This is inverted for the right neighbor.
     */  
    const l_nbr = await this.dht_lookup(
      ptr_left(get_label(leaf)[get_label(leaf).length - 1] === "0" ? leaf : sib)
    );

    const r_nbr = await this.dht_lookup(
      ptr_right(get_label(leaf)[get_label(leaf).length - 1] === "1" ? leaf : sib)
    );

    set_ptrs({
      node: parent, 
      left: l_nbr !== null ? get_label(l_nbr) : null, 
      right: r_nbr !== null ? get_label(r_nbr) : null
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
    const parent_sib = await this.dht_lookup(get_sibling_label(parent));

    if (parent_sib === null || pairs.length + size(parent_sib) > Pht.B) {
      pairs.forEach((pair) => {
        const [key, val] = pair;
        put({node: parent, key: key, val: val});  
        Journal.log(Pht.TAG, `Redistributed key ${get_integral(key)} (integral) -> ${this.index} ` + 
          `${get_label(parent)} (DHT key ${this.get_label_hash(get_label(parent))})`);
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
  async delete(key) {
    const key_str = get_integral(key).to_base2_str();
    const leaf = await this.full_search(key_str);

    /**
     * If we can't find the leaf node for a key, our trie is likely corrupted
     * TODO: disable this for production
     */
    if (leaf === null) {
      throw new Error("Fatal PHT error");
    }

    const res = del({node: leaf, key: key});

    /**
     * The data you want to delete doesn't exist
     */ 
    if (!res) {
      return;
    }

    const sib = await this.dht_lookup(get_sibling_label(leaf));

    if (sib === null || !is_leaf(sib) || size(leaf) + size(sib) > Pht.B) {
      /**
       * There's 3 cases where we cannot merge: 
       * 
       * A) if the data was found in the root node 
       * B) if the data was found in a node whose sibling is an internal node
       * C) if the data was found in a node whose sibling is a leaf, but together they contain > B keys
       */ 
      await this.db.write(this.get_label_hash(get_label(leaf)), leaf);
    } else if (is_leaf(sib) && size(leaf) + size(sib) <= Pht.B) {
      /**
       * The hard case: leaf and its sibling are both leaf nodes, and together they contain <= B 
       * keys, so we must perform a merge!
       */ 
      const pairs = get_all_pairs(leaf).concat(get_all_pairs(sib)).map((pair) => {
        const [key, val] = pair;
        return [from_str(key), val];
      });

      await this._do_merge_delete({
        pairs: pairs,
        leaf: leaf,
        sib: sib
      });
    }

    Journal.log(Pht.TAG, `Deleted key ${get_integral(key).to_hex_str()} (integral) -> ${this.index} ` + 
        `${get_label(leaf)} (DHT key ${this.get_label_hash(get_label(leaf)).to_hex_str()})`);
  }

  async _do_range_query_2d({pht_node, minkey_2d, maxkey_2d, data = [], status_cb} = {}) {
    /**
     * Base case: it's a leaf node
     */ 
    if (is_leaf(pht_node)) {
      const valid_pairs = get_all_pairs(pht_node).filter((pair) => {
        const [key, val] = pair;
        const zvalue = get_integral(from_str(key));
        const zvalue_2d = morton_invert_2d(zvalue);
        return zvalue_2d.x.greater_equal(minkey_2d.x) && zvalue_2d.x.less(maxkey_2d.x) && 
          zvalue_2d.y.greater_equal(minkey_2d.y) && zvalue_2d.y.less(maxkey_2d.y);
      });

      if (valid_pairs.length > 0) {
        status_cb(valid_pairs);
      }

      return data.concat(valid_pairs);
    } 

    /**
     * Recursive case: it's an internal node. TODO: this must be parallelized
     */ 
    const subtree_0 = `${pht_node.label}0`;
    const subtree_1 = `${pht_node.label}1`;
    const subtree_0_zvalue = Bigboy.from_base2_str({len: BIT_DOMAIN / 8, str: subtree_0});
    const subtree_1_zvalue = Bigboy.from_base2_str({len: BIT_DOMAIN / 8, str: subtree_1});
    const subtree_0_2d = morton_invert_2d(subtree_0_zvalue);
    const subtree_1_2d = morton_invert_2d(subtree_1_zvalue);
    
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
      const child_node = await this.dht_lookup(subtree_0);

      if (child_node === null) {
        throw new Error("Fatal PHT error");
      }

      data = await this._do_range_query_2d.bind(this)({
        pht_node: child_node,
        minkey_2d: minkey_2d,
        maxkey_2d: maxkey_2d,
        data: data,
        status_cb: status_cb
      });
    }

    if (subtree_1_2d.x.less(maxkey_2d.x) && subtree_1_2d.y.less(maxkey_2d.y)) {
      const child_node = await this.dht_lookup(subtree_1);

      if (child_node === null) {
        throw new Error("Fatal PHT error");
      }

      data = await this._do_range_query_2d.bind(this)({
        pht_node: child_node,
        minkey_2d: minkey_2d,
        maxkey_2d: maxkey_2d,
        data: data,
        status_cb: status_cb
      });
    }

    return data;
  }

  /**
   * 2D range query, where minkey and maxkey are 2D values mapped to one dimension using a Morton
   * order curve. Note a distinction here: PHT update operations require a PHT key because data
   * is stored to the network under a serialized key, but 2D range query takes a Bigboy because
   * range queries are concerned only with the integral parts of PHT keys.
   * 
   * We resolve with the results upon completing our trie traversal. If you're impatient, you can 
   * access partial results using callback 'status_cb'; during traversal, status_cb() is called immediately 
   * for each leaf node which yields a partial result. It's passed an array of [key, val] pairs. 
   */ 
  async range_query_2d(minkey, maxkey, status_cb = () => {}) {
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
    const lcp = get_lcp([minkey.to_base2_str(), maxkey.to_base2_str()]);
    let start = await this.dht_lookup(lcp);

    if (start === null) {
      start = await this.full_search(lcp);
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
      minkey_2d: morton_invert_2d(minkey),
      maxkey_2d: morton_invert_2d(maxkey),
      status_cb: status_cb
    });
  }
}

module.exports = { Pht };