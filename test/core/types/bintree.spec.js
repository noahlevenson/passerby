"use strict";

const assert = require("assert");
const { Bintree, Bintree_node } = require("../../../src/core/types/bintree.js");

/**
 * Default constructor
 */ 
(() => {
  assert.doesNotThrow(() => {
    const foo = new Bintree();
  });

  assert.doesNotThrow(() => {
    const foo = new Bintree(new Bintree_node());
  });

  assert.strictEqual(new Bintree().get_root(), null);
})();

const tree0 = new Bintree();

const tree1 = new Bintree(new Bintree_node({data: "root"}));

const tree2 = new Bintree(new Bintree_node({data: "root"}));
tree2.get_root().set_right(new Bintree_node({data: "right"}));

const tree3 = new Bintree(new Bintree_node({data: "root"}));
tree3.get_root().set_left(new Bintree_node({data: "left"}));
tree3.get_root().set_right(new Bintree_node({data: "right"}));

/**
 * dfs_post()
 */ 
(() => {
  assert.throws(() => {
    const foo = tree0.dfs_post((node, data) => data.push(node.get_data()));
  });

  assert.deepStrictEqual(tree1.dfs_post((node, data) => data.push(node.get_data())), ["root"]);
  
  assert.deepStrictEqual(
    tree2.dfs_post((node, data) => data.push(node.get_data())), 
    ["right", "root"]
  );

  assert.deepStrictEqual(
    tree3.dfs_post((node, data) => data.push(node.get_data())),
    ["left", "right", "root"]
  );
})();

/**
 * dfs_in()
 */ 
(() => {
  assert.throws(() => {
    const foo = tree0.dfs_in((node, data) => data.push(node.get_data()));
  });

  assert.deepStrictEqual(tree1.dfs_in((node, data) => data.push(node.get_data())), ["root"]);

  assert.deepStrictEqual(
    tree2.dfs_in((node, data) => data.push(node.get_data())), 
    ["root", "right"]
  );

  assert.deepStrictEqual(
    tree3.dfs_in((node, data) => data.push(node.get_data())),
    ["left", "root", "right"]
  );
})();

/**
 * size()
 */ 
(() => {
   assert.strictEqual(tree0.size(), 0);
   assert.strictEqual(tree1.size(), 1);
   assert.strictEqual(tree2.size(), 2);
   assert.strictEqual(tree3.size(), 3);
})();