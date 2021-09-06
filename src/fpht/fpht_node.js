/** 
* FPHT_NODE
* A serializable PHT node
*
*
*
*
*/ 

"use strict";

const { Fapp_cfg } = require("../fapp/fapp_cfg.js");
const cfg = require("../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");

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

  static put({node, key, val} = {}) {
    if (!(key instanceof Fbigint)) {
      throw new TypeError("Argument 'key' must be Fbigint");
    }

    node.data[key.toString()] = val;
  }

  static get({node, key} = {}) {
    if (!(key instanceof Fbigint)) {
      throw new TypeError("Argument 'key' must be Fbigint");
    }

    return node.data[key.toString()];
  }

  static delete({node, key}) {
    const key_str = key.toString();

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