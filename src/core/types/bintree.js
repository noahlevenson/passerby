"use strict";

class Bintree {
  constructor(root = null) {
    this._root = root;
  }

  get_root() {
    return this._root;
  }

  _cbwrap(node, data, cb) {
    cb(node, data);
    return data;
  }

  /** 
   * Depth first search, postorder traversal. Callback 'cb' is executed upon visiting each node.
   */ 
  dfs_post(cb = (node, data) => {}, node = this.get_root(), data = []) {
    if (node === null) {
      throw new Error("Uninitialized Bintree");
    }

    if (node.get_left() !== null) {
      data = this.dfs_post(cb, node.get_left(), data);
    }

    if (node.get_right() !== null) {
      data = this.dfs_post(cb, node.get_right(), data);
    }

    return this._cbwrap(node, data, cb);
  }

  /**
   * Depth first search, inorder traversal. Callback 'cb' is executed upon visiting each node.
   */ 
  dfs_in(cb = (node, data) => {}, node = this.get_root(), data = []) {
    if (node === null) {
      throw new Error("Uninitialized Bintree");
    }

    if (node.get_left() !== null) {
      data = this.dfs_in(cb, node.get_left(), data); 
    }
    
    data = this._cbwrap(node, data, cb);

    if (node.get_right() !== null) {
      data = this.dfs_in(cb, node.get_right(), data);
    }
    
    return data;
  }

  /**
   * Return the number of nodes in the tree in O(n)
   */ 
  size() {
    if (this.get_root() === null) {
      return 0;
    }

    return this.dfs_post((node, data) => data.push(true)).length;
  }

  /**
   * Search a BST for key k using comparator function f(k, node)
   * Comparator function must return:
   * < 0 if k < node.k
   * > 0 if k > node.k
   * 0 if k === node.k
   * Assumes you're maintaining the BST invariants and values are unique!
   */ 
  bst_search(f, k, node = this.get_root()) {
    if (node === null || f(k, node) === 0) {
      return node;
    }

    if (f(k, node) < 0) {
      return this.bst_search(f, k, node.get_left());
    } else {
      return this.bst_search(f, k, node.get_right());
    }
  }

  /**
   * Insert a node into a BST using comparator function f(..., node, oldnode)
   * Comparator function must return:
   * < 0 if node.data < oldnode.data
   * > 0 if node.data > oldnode.data
   * 0 if node.data === oldnode.data
   * Assumes you're maintaining the BST invariants and values are unique!
   */ 
  bst_insert(node, f) {
    let y = null;
    let x = this.get_root();

    while (x !== null) {
      y = x;

      if (f(node, x) < 0) {
        x = x.get_left();
      } else if (f(node, x) > 0) {
        x = x.get_right();
      } else {
        // The tree already holds this value, overwrite
        x.set_data(node.get_data());
        x = null;
      }
    }

    node.set_parent(y);

    if (y === null) {
      this._root = node;
    } else if (f(node, y) < 0) {
      y.set_left(node);
    } else if (f(node, y) > 0){
      y.set_right(node);
    }
  }

  _bst_transplant(u, v) {
    if (u.get_parent() === null) {
      this._root = v;
    } else if (u === u.get_parent().get_left()) {
      u.get_parent().set_left(v);
    } else {
      u.get_parent().set_right(v);
    }

    if (v !== null) {
      v.set_parent(u.get_parent());
    }
  }

  // Delete a node from a BST
  bst_delete(node) {
    if (node.get_left() === null) {
      this._bst_transplant(node, node.get_right());
    } else if (node.get_right() === null) {
      this._bst_transplant(node, node.get_left());
    } else {
      const y = this.bst_min(node.get_right());

      if (y.get_parent() !== node) {
        this._bst_transplant(y, y.get_right());
        y.set_right(node.get_right());
        y.get_right().set_parent(y);
      }

      this._bst_transplant(node, y);
      y.set_left(node.get_left());
      y.get_left().set_parent(y);
    }
  }

  /**
   * Get minimum value in a BST
   * Assumes you're maintaining the BST invariants!
   * Returns the node containing the minimum value
   */ 
  bst_min(node = this.get_root()) {
    if (node === null) {
      return null;
    }

    while (node.get_left() !== null) {
      node = node.get_left();
    }

    return node;
  }

  /**
   * Get maximum value in a BST
   * Assumes you're maintaining the BST invariants!
   * Returns the node containing the maximum value
   */ 
  bst_max(node = this.get_root()) {
    if (node === null) {
      return null
    }
    
    while (node.get_right() !== null) {
      node = node.get_right();
    }

    return node;
  }

  /**
   * Get the successor to a node in a BST
   * Assumes you're maintaining the BST invariants!
   * Returns the successor node
   */ 
  bst_successor(node) {
    if (node.get_right() !== null) {
      return this.bst_min(node.get_right());
    }

    let p = node.get_parent();

    while (p !== null && node === p.get_right()) {
      node = p;
      p = p.get_parent();
    }

    return p;
  }
}

class Bintree_node {
  constructor({left = null, right = null, parent = null, data = null} = {}) {
    this._data = data;
    this._parent = parent;
    
    this.children = {
      0x00: left,
      0x01: right
    };
  }

  get_data() {
    return this._data;
  }

  set_data(data) {
    this._data = data;
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
    return this._parent;
  }

  set_parent(node) {
    this._parent = node;
  }
}

module.exports = { Bintree, Bintree_node };