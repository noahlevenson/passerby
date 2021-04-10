/** 
* FNTREE_NODE
* Class for an n-ary tree node
*
* 
*
*
*/ 

"use strict";

class Fntree_node {
	data;
	parent;
	children;

	constructor({data = null, parent = null, children = []} = {}) {
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
		this.children.push(node);
		return node;
	}

	delete_child(node) {
		return this.children.splice(this.children.indexOf(node), 1)[0];
	}

	// Get child by index or undefined if out of range
	get_child(i) {
		return this.children[i];
	}

	// Get a shallow copy of this node's children as an array
	get_all_children() {
		return [...this.children];
	}

	degree() {
		return this.children.length;
	}
}

module.exports.Fntree_node = Fntree_node;