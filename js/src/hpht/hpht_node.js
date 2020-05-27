/** 
* HPHT_NODE
* Class for a PHT node
*
*
*
*
*/ 

"use strict";

const { Hbigint } = require("../htypes/hbigint/hbigint_node.js");

class Hpht_node {
	static MAGIC_VAL = `${Buffer.from([0x19, 0x81]).toString()}v3ryrar3`;
	
	created;
	label;
	children;
	ptrs;
	data;
	magic;

	constructor({label = null, created = new Date(), children = {0x00: null, 0x01: null}, ptrs = {"left": null, "right": null}, data = null} = {}) {
		// TODO: validation
		if (typeof label !== "string") {
			throw new TypeError("Argument 'label' must be string");
		}

		if (data === null) {
			this.data = new Map();
		} else {
			this.data = data instanceof Map ? data : Map.from_json(data);
		}

		this.label = label;
		this.created = created;
		this.children = children;
		this.ptrs = ptrs;
		this.magic = Hpht_node.MAGIC_VAL.slice(0);
	}	

	// TODO: Make this more reliable - currently we just implement some dumb magic buffer but there should be some thought put into this
	// this object identification is a big part of security as well!!!
	static valid_magic(obj) {
		try {
			return obj.magic === Hpht_node.MAGIC_VAL ? true : false;
		} catch(err) {
			return false;
		}
	}
	
	// For some reason I wrote a setter for the pointers, we need to do this for children too
	set_ptrs({left = null, right = null} = {}) {
		if (typeof left !== "string" && left !== null) {
			throw new TypeError("Argument 'left' must be string or null");
		}

		if (typeof right !== "string" && right !== null) {
			throw new TypeError("Argument 'left' must be string or null");
		}

		this.ptrs.left = left;
		this.ptrs.right = right;
	}

	ptr_left() {
		return this.ptrs.left;
	}

	ptr_right() {
		return this.ptrs.right;
	}

	get_label() {
		return this.label;
	}

	// It it funky to assume that our labels are strings of 0's and 1's? At construction time, we allow the assignment of any string as a label...
	get_sibling_label() {
		return `${this.label.substring(0, this.label.length - 1)}${this.label[this.label.length - 1] === "0" ? "1" : "0"}`;
	}

	// It it funky to assume that our labels are strings of 0's and 1's? At construction time, we allow the assignment of any string as a label...
	get_parent_label() {
		return this.label.substring(0, this.label.length - 1);
	}

	is_leaf() {
		return (this.children[0x00] === null && this.children[0x01] === null); // TODO: We only must check one because a node can't have only one child
	}

	size() {
		return this.data.size;
	}

	put(key, val) {
		if (!(key instanceof Hbigint)) {
			throw new TypeError("Argument 'key' must be Hbigint");
		}

		return this.data.set(key.toString(), val);
	}

	get(key) {
		if (!(key instanceof Hbigint)) {
			throw new TypeError("Argument 'key' must be Hbigint");
		}

		return this.data.get(key.toString());
	}

	delete(key) {
		return this.data.delete(key.toString());
	}

	get_all_pairs() {
		return Array.from(this.data.entries());
	}
}

module.exports.Hpht_node = Hpht_node;