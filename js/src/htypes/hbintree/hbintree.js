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
}

module.exports.Hbintree = Hbintree;