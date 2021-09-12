/** 
* FBINTREE_NODE
* Binary tree node
*
* 
*
*
*/ 

"use strict";

class Fbintree_node {
  data;
  parent;
  children;

  constructor({left = null, right = null, parent = null, data = null} = {}) {
    this.data = data;
    this.parent = parent;
    
    this.children = {
      0x00: left,
      0x01: right
    };
  }

  get_data() {
    return this.data;
  }

  set_data(data) {
    this.data = data;
  }

  /**
   * Alias to get the left or right child by specifying a bit as a Number: 0 = left, 1 = right
   */ 
  get_child_bin(b) {
    return this.children[b];
  }

  get_left() {
    return this.children[0];
  }

  get_right() {
    return this.children[1];
  }

  set_left(node) {
    // TODO: consider setting node.parent to this node? 
    this.children[0] = node;
  } 

  set_right(node) {
    // TODO: consider setting node.parent to this node?
    this.children[1] = node;
  }

  get_parent() {
    return this.parent;
  }

  set_parent(node) {
    this.parent = node;
  }
}

module.exports.Fbintree_node = Fbintree_node;