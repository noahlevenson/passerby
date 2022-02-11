"use strict";

const { to_str } = require("./key.js");

const MAGIC = "P4SS3RBY";

function node({label = "", child_0 = null, child_1 = null, l_ptr = null, r_ptr = null, data = {}} = {}) {
  return {
    label: label,
    child_0: child_0,
    child_1: child_1,
    l_ptr: l_ptr,
    r_ptr: r_ptr,
    data: data,
    magic: MAGIC.slice(0)
  };
}

function valid_magic(node) {
  try {
    return node.magic === MAGIC;
  } catch (err) {
    return false;
  }
}

function set_ptrs({node, left = null, right = null} = {}) {
  if (typeof left !== "string" && left !== null) {
    throw new TypeError("Argument 'left' must be string or null");
  }

  if (typeof right !== "string" && right !== null) {
    throw new TypeError("Argument 'left' must be string or null");
  }

  node.l_ptr = left;
  node.r_ptr = right;
}

function set_children({node, child_0 = null, child_1 = null}) {
  node.child_0 = child_0;
  node.child_1 = child_1;
}

function ptr_left(node) {
  return node.l_ptr;
}

function ptr_right(node) {
  return node.r_ptr;
}

function get_label(node) {
  return node.label;
}

/**
 * TODO: for get_sibling_label() and get_parent_label(), we dangerously assume that our labels
 * are binary strings. Our labels are supposed to be binary strings, but there's no validation...
 */

function get_sibling_label(node) {
  if (node.label.length === 0) {
    return null;
  }

  return `${node.label.substring(0, node.label.length - 1)}` +
    `${node.label[node.label.length - 1] === "0" ? "1" : "0"}`;
}

function get_parent_label(node) {
  if (node.label.length === 0) {
    return null;
  }

  return node.label.substring(0, node.label.length - 1);
}

function is_leaf(node) {
  return node.child_0 === null && node.child_1 === null;
}

function size(node) {
  return Object.keys(node.data).length;
}

function put({node, key, val} = {}) {
  node.data[to_str(key)] = val;
}

function get({node, key} = {}) {
  return node.data[to_str(key)];
}

function del({node, key}) {
  const key_str = to_str(key);

  if (node.data[key_str]) {
    delete node.data[key_str];
    return true;
  }

  return false;
}

function get_all_pairs(node) {
  return Object.entries(node.data);
}

module.exports = { MAGIC, node, valid_magic, set_ptrs, set_children, ptr_left, ptr_right, get_label,
  get_sibling_label, get_parent_label, is_leaf, size, put, get, del, get_all_pairs };