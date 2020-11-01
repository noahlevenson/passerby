/** 
* HNTREE
* Class for an n-ary tree
*
* 
*
*
*/ 

"use strict";

const { Hntree_node } = require("./hntree_node.js");

class Hntree {
	static JSON_PREFIX = "__$!~HNTREE~";

	root;

	constructor(root = null) {
		this.root = root;
	}

	// Factory function / alternate JSON constructor
	static from_json(json) {
		const arr = JSON.parse(json.substring(Hntree.JSON_PREFIX.length));
		const tree = new this(new Hntree_node({data: arr[0]}));
		    
		let node = tree.get_root();

		arr.slice(1).forEach((elem) => {
			if (elem === null) {
				node = node.parent;
				return; 
			}

			node = node.add_child(new Hntree_node({data: elem, parent: node}));
		});

		return tree;
	}

	static _json_revive(key, val) {
		if (typeof val === "string" && val.substring(0, Hntree.JSON_PREFIX.length) === Hntree.JSON_PREFIX) {
			return Hntree.from_json(val.substring(Hntree.JSON_PREFIX.length, val.length));
		}

		return val;
	}

	get_root() {
		return this.root;
	}

	// Depth first search, returns array data, you can put whatever you want in there
	// Calls visitation callback pre(node, data) where you'd want it for a preorder traversal, calls post(node, data) postorder
	dfs(pre = () => {}, post = () => {}, node = this.get_root(), data = []) {
		pre(node, data)

		node.get_all_children().forEach((child) => {
			data = this.dfs(pre, post, child, data);
		});

		post(node, data);
		return data;
	}

	// Simple serializer: serialize as a flat array of node data with null sentinels
	// to indicate that a given node has no more children 
	toJSON() {
		const arr = [];

	    this.dfs((node, data) => {
	        arr.push(node.data);
	    }, (node, data) => {
	        arr.push(null);
	    });
	    
	    return `${Hntree.JSON_PREFIX}${JSON.stringify(arr)}`;
	}
}

module.exports.Hntree = Hntree;