/** 
* HBUY_MENU
* Class for an HBUY menu
* 
* 
* 
* 
*/ 

"use strict";

const { Hntree } = require("../htypes/hntree/hntree.js");
const { Hntree_node } = require("../htypes/hntree/hntree_node.js");
const { Hutil } = require("../hutil/hutil.js");

class Hbuy_menu {
	data;
	min_order;
	taxes;

	constructor({name = "", min_order = 0.00, taxes = []} = {}) {
		// TODO: validation
		this.data = new Hntree(new Hntree_node({data: name}));
		this.min_order = min_order;
		this.taxes = taxes;
	}

	// Every kind of HBUY order form (like an Hbuy_menu) must implement a function
	// to compute its form id, which is the hash of its Hntree
	// Buyers and sellers compare form IDs to make sure they're referencing items
	// from the same order form
	get_form_id() {
		// Eliminate circular refs and recursively give Set objects a serializer
		function _replacer(key, value) {
			if (key === "parent") {
				return undefined;
			}

			if (value instanceof Set) {
				return JSON.stringify(Array.from(value.values()), _replacer);
			}

			return value
		}

		const json = JSON.stringify(this.data, _replacer);
		return Hutil._sha1(json);
	}

	// Return an array of all the Hbuy_item objects in this menu
	get_items() {
		return this.data.dfs((node, data) => {
			if (node.num_children() === 0) {
				data.push(node.data);
			}

			return data;
		});
	}

	// Return an array of all the section labels of this menu
	get_sections() {
		return this.data.dfs((node, data) => {
			if (node.num_children() > 0) {
				data.push(node.data);
			}

			return data;
		});
	}

	// TODO: Add functions for inserting/deleting sections and items
}

module.exports.Hbuy_menu = Hbuy_menu;