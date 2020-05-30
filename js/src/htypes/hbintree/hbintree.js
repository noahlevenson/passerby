/** 
* HBINTREE
* Class for a binary tree
*
* 
*
*
*/ 

"use strict";

const { Hbintree_node } = require("./hbintree_node.js");

class Hbintree {
	root;

	constructor() {
		this.root = new Hbintree_node();
	}

	get_root() {
		return this.root;
	}

	// Depth first search -- returns an array of which the contents
	// are determined by the callback function cb, which is 
	// executed for every node in the tree
	dfs(cb, node = this.get_root(), data = []) {
		if (node.get_left() !== null) {
			data = this.dfs(cb, node.get_left(), data);
		}

		if (node.get_right() !== null) {
			data = this.dfs(cb, node.get_right(), data);
		}

		return cb(node, data);
	}
}

module.exports.Hbintree = Hbintree;