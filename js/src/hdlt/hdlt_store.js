/** 
* HDLT_STORE
* Data store for HDLT, combining a tree for branching
* and a hashmap for O(1) lookups
* 
*
*
*/ 

"use strict";

const { Hdlt_block } = require("./hdlt_block.js");
const { Hntree } = require("../htypes/hntree/hntree.js");
const { Hntree_node } = require("../htypes/hntree/hntree_node.js");

class Hdlt_store {
	static GENESIS = {
		hash_prev: 0x00,
		hash_merkle_root: 0x00,
		nonce: "00",
		tsacts: []
	};

	tree;
	dict;

	constructor(tree = new Hntree(new Hntree_node({data: Hdlt_store.GENESIS}))) {
		this.tree = tree;
		this.dict = new Map();
		this.build_dict();
	}

	build_dict() {
		this.dict.clear();

		this.tree.dfs((node, data) => {
			this.dict.set(Hdlt_block.sha256(node.data), node);
		}, (node, data) => {}, this.tree.get_root());
	}

	// Fetch a tree node by block hash, returns undefined if not found
	get_node(hash) {
		return this.dict.get(hash);
	}

	// Get the tree nodes corresponding to the deepest blocks in the tree
	// in a tree where there is one longest branch, this will return one node
	get_deepest_blocks() {
		const pg = this.tree.bfs((node, d, data) => {
			data.push([node, d]);
		});

		const max_d = Math.max(...pg.map(pair => pair[1]));
		return pg.filter(pair => pair[1] === max_d).map(pair => pair[0]);
	}
};

module.exports.Hdlt_store = Hdlt_store;