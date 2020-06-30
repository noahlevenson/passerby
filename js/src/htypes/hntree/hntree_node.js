/** 
* HNTREE_NODE
* Class for an n-ary tree node
*
* 
*
*
*/ 

"use strict";

class Hntree_node {
	data;
	parent;
	children;

	constructor({data = null, parent = null, children = new Set()} = {}) {
		this.data = data;
		this.parent = parent;
		this.children = children;
	}

	get_data() {
		return this.data;
	}

	set_data(data) {
		this.data = data;
	}

	add_child(node) {
		this.children.add(node);
		return node;
	}

	delete_child(node) {
		this.children.delete(node);
	}

	// Get child by index
	get_child(i) {
		const nodes = Array.from(this.children.values());

		if (nodes.length > i) {
			return nodes[i];
		} 

		return null;
	}

	// Get an array of this node's children (empty array if none)
	get_all_children() {
		return Array.from(this.children.values());
	}

	num_children() {
		return this.get_all_children().length;
	}
}

module.exports.Hntree_node = Hntree_node;