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
  children;
  ptrs;
  data;
  created;
  magic;

  constructor({
    label = null, 
    child_0 = null,
    child_1 = null,
    l_ptr = null,
    r_ptr = null,
    data = {}
  } = {}) {
    this.data = data;
    this.label = label;
    this.created = Date.now();
    this.children = {0x00: child_0, 0x01: child_1};
    this.ptrs = {left: l_ptr, right: r_ptr};
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

    node.ptrs.left = left;
    node.ptrs.right = right;
  }
  
  static ptr_left(node) {
    return node.ptrs.left;
  }

  static ptr_right(node) {
    return node.ptrs.right;
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
    return node.children[0x00] === null && node.children[0x01] === null;
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

  static get_created(node) {
    return node.created;
  }
}

module.exports.Fpht_node = Fpht_node;