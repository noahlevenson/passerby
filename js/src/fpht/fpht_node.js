/** 
* FPHT_NODE
* Class for a PHT node
*
*
*
*
*/ 

"use strict";

const { Fapp_env } = require("../fapp/fapp_env.js");
const { Fbigint } = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");

class Fpht_node {
	static MAGIC_VAL = `${Buffer.from([0x19, 0x81]).toString()}v3ryrar3`;
	
	created;
	label;
	children;
	ptrs;
	data;
	magic;

	constructor({label = null, children = {0x00: null, 0x01: null}, ptrs = {"left": null, "right": null}, data = null} = {}) {
		if (typeof label !== "string") {
			throw new TypeError("Argument 'label' must be string");
		}

		if (data === null) {
			this.data = new Map();
		} else {
			this.data = data instanceof Map ? data : Map.from_json(data);
		}

		this.label = label;
		this.created = Date.now();
		this.children = children;
		this.ptrs = ptrs;
		this.magic = Fpht_node.MAGIC_VAL.slice(0);
	}	

	// Currently this magic cookie is the only way we discern a valid PHT node from other data
	static valid_magic(obj) {
		try {
			return obj.magic === Fpht_node.MAGIC_VAL ? true : false;
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
		if (this.label.length < 1) {
			return null;
		}

		return this.label.substring(0, this.label.length - 1);
	}

	is_leaf() {
		return (this.children[0x00] === null && this.children[0x01] === null);
	}

	size() {
		return this.data.size;
	}

	put(key, val) {
		if (!(key instanceof Fbigint)) {
			throw new TypeError("Argument 'key' must be Fbigint");
		}

		return this.data.set(key.toString(), val);
	}

	get(key) {
		if (!(key instanceof Fbigint)) {
			throw new TypeError("Argument 'key' must be Fbigint");
		}

		return this.data.get(key.toString());
	}

	delete(key) {
		return this.data.delete(key.toString());
	}

	get_all_pairs() {
		return Array.from(this.data.entries());
	}

	get_created() {
		return this.created;
	}
}

module.exports.Fpht_node = Fpht_node;