/** 
* FPHT_NODE
* A serializable PHT node
*
*
*
*
*/ 

"use strict";

const { Fpht_key } = require("./fpht_key.js"); 

class Fpht_node {
  static MAGIC_VAL = `FR33F00D`;
  
  label;
  child_0;
  child_1;
  l_ptr;
  r_ptr;
  data;
  magic;

  constructor({
    label = null, 
    child_0 = null,
    child_1 = null,
    l_ptr = null,
    r_ptr = null,
    data = {}
  } = {}) {
    this.label = label;
    this.child_0 = child_0;
    this.child_1 = child_1;
    this.l_ptr = l_ptr;
    this.r_ptr = r_ptr;
    this.data = data;
    this.magic = Fpht_node.MAGIC_VAL.slice(0);
  } 

  static valid_magic(node) {
    try {
      return node.magic === Fpht_node.MAGIC_VAL ? true : false;
    } catch(err) {
      return false;
    }
  }

  static set_ptrs({node, left = null, right = null} = {}) {
    if (typeof left !== "string" && left !== null) {
      throw new TypeError("Argument 'left' must be string or null");
    }

    if (typeof right !== "string" && right !== null) {
      throw new TypeError("Argument 'left' must be string or null");
    }

    node.l_ptr = left;
    node.r_ptr = right;
  }

  static set_children({node, child_0 = null, child_1 = null}) {
    node.child_0 = child_0;
    node.child_1 = child_1;
  }
  
  static ptr_left(node) {
    return node.l_ptr;
  }

  static ptr_right(node) {
    return node.r_ptr;
  }

  static get_label(node) {
    return node.label;
  }

  /**
   * TODO: for get_sibling_label() and get_parent_label(), we dangerously assume that our labels
   * are binary strings. Our labels are supposed to be binary strings, but there's no validation...
   */

  static get_sibling_label(node) {
    if (node.label.length === 0) {
      return null;
    }

    return `${node.label.substring(0, node.label.length - 1)}` +
      `${node.label[node.label.length - 1] === "0" ? "1" : "0"}`;
  }

  static get_parent_label(node) {
    if (node.label.length === 0) {
      return null;
    }

    return node.label.substring(0, node.label.length - 1);
  }

  static is_leaf(node) {
    return node.child_0 === null && node.child_1 === null;
  }

  static size(node) {
    return Object.keys(node.data).length;
  }

  static put({node, fpht_key, val} = {}) {
    if (!(fpht_key instanceof Fpht_key)) {
      throw new TypeError("Argument 'fpht_key' must be Fpht_key");
    }

    node.data[Fpht_key.to_str(fpht_key)] = val;
  }

  static get({node, fpht_key} = {}) {
    if (!(fpht_key instanceof Fpht_key)) {
      throw new TypeError("Argument 'fpht_key' must be Fpht_key");
    }

    return node.data[Fpht_key.to_str(fpht_key)];
  }

  static delete({node, fpht_key}) {
    if (!(fpht_key instanceof Fpht_key)) {
      throw new TypeError("Argument 'fpht_key' must be Fpht_key");
    }

    const key_str = Fpht_key.to_str(fpht_key);

    if (node.data[key_str]) {
      delete node.data[key_str];
      return true;
    }

    return false;
  }

  static get_all_pairs(node) {
    return Object.entries(node.data);
  }
}

module.exports.Fpht_node = Fpht_node;