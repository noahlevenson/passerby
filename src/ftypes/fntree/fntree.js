/** 
* FNTREE
* N-ary (k-way) tree
*
* 
*
*
*/ 

"use strict";

const { Fntree_node } = require("./fntree_node.js");

class Fntree {
  static COLOR = {
    BLACK: 0,
    WHITE: 1
  };

  root;

  constructor(root = null) {
    this.root = root;
  }

  /**
   * Factory function to construct an Fntree from its serialized representation
   */ 
  static from_json(json) {
    const arr = JSON.parse(json);
    const tree = new this(new Fntree_node({data: arr[0]}));
    let node = tree.get_root();
    
    arr.slice(1).forEach((elem) => {
      if (elem === null) {
        node = node.parent;
        return;
      }

      node = node.add_child(new Fntree_node({data: elem, parent: node}));
    });

    return tree;
  }

  /**
   * Simple serializer: an Fntree is serialized as a flat array of node data in DFS preorder 
   * traversal order, with null sentinels to indicate the end of a branch
   */ 
  toJSON() {
    const arr = [];

    this.dfs((node, data) => {
      arr.push(node.data);
    }, (node, data) => {
      arr.push(null);
    });

    return JSON.stringify(arr);
  }

  get_root() {
    return this.root;
  }

  /**
   * Depth first search. Traversal order behavior is parameterizable: visitation callback 'pre' is 
   * called in preorder position, 'post' is called in postorder position. i.e., to do a preorder
   * traversal, pass a 'pre' visitation callback and no 'post' callback. 'data' array is passed as
   * the second argument to the callbacks and returned at the termination of search.
   */
  dfs(pre = () => {}, post = () => {}, node = this.get_root(), data = []) {
    pre(node, data);

    node.get_all_children().forEach((child) => {
      data = this.dfs(pre, post, child, data);
    });

    post(node, data);
    return data;
  }

  /**
   * Breadth first search. Visitation callback 'visit' is executed for each node. Set 'undirected'
   * to true to consider the tree as an undirected graph and explore each node's parent as well as
   * its children. TODO: why are we doing DFS first? Noob activities detected
   */
  bfs(visit = () => {}, node = this.get_root(), data = [], undirected = false) {
    // Get the nodes in a list so we can refer to them by index number
    const node_list = this.dfs((node, acc) => {
      acc.push(node);
    });

    // Create a parallel list of labels
    const label_list = [];

    for (let i = 0; i < node_list.length; i += 1) {
      label_list.push({label: Fntree.COLOR.WHITE, d: Number.POSITIVE_INFINITY});
    }

    const q = [];
    label_list[node_list.indexOf(node)] = {label: Fntree.COLOR.BLACK, d: 0};
    q.push(node);

    while (q.length > 0) {
      const v = q.pop();
      visit(v, label_list[node_list.indexOf(v)].d, data);
      const parent = undirected && v.parent !== null ? [v.parent] : [];

      v.get_all_children().concat(parent).forEach((w) => {
        if (label_list[node_list.indexOf(w)].label === Fntree.COLOR.WHITE) {
          label_list[node_list.indexOf(w)] = {
            label: Fntree.COLOR.BLACK, 
            d: label_list[node_list.indexOf(v)].d + 1
          };
          
          q.push(w);
        }
      });
    }

    return data;
  }
}

module.exports.Fntree = Fntree;