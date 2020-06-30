/** 
* HNTREE
* Class for an n-ary tree
*
* 
*
*
*/ 

"use strict";

class Hntree {
	root;

	constructor(root = null) {
		this.root = root;
	}

	get_root() {
		return this.root;
	}

	// Depth first search -- returns an array of which the contents
	// are determined by the callback function cb, which is 
	// executed for every node in the tree
	// Assumes that the tree has at least 1 node
	dfs(cb, node = this.get_root(), data = []) {
		const children = node.get_all_children();

		if (children.length > 0) {
			children.forEach((child) => {
				data = this.dfs(cb, child, data);
			});
		}

		return cb(node, data);
	}
}

module.exports.Hntree = Hntree;