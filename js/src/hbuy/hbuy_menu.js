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
	static KEYWORDS = {
		"Pizza": 0,
		"Chinese": 1,
		"Sandwiches": 2,
		"Bagels": 3,
		"Breakfast": 4,
		"Mexican": 5,
		"Diner": 6,
		"Dessert": 7,
		"Italian": 8,
		"Latin American": 9,
		"Japanese": 10,
		"Thai": 11,
		"Indian": 12,
		"Caribbean": 13,
		"Burgers": 14
	};

	data;
	min_order;
	taxes;

	constructor({name = "", min_order = 0.00, taxes = [], data = null} = {}) {
		// TODO: validation
		if (data === null) {
			this.data = new Hntree(new Hntree_node({data: name}));
		} else {
			this.data = data instanceof Hntree ? data : Hntree.from_json(data);
		}

		this.min_order = min_order;
		this.taxes = taxes;
	}

	// Every kind of HBUY order form (like an Hbuy_menu) must implement a function
	// to compute its form id, which is the hash of its item list - buyers and sellers 
	// compare form IDs to make sure they're referencing the same items
	get_form_id() {
		const json = JSON.stringify(this.get_item_list());
		return Hutil._sha1(json);
	}

	// Return a deterministically ordered array containing both section labels and Hbuy_item objects via inorder traversal
	get_full_list() {
		return this.data.dfs((node, data) => {
			data.push(node.data);
			return data;
		});
	}

	// Return a deterministically ordered array of all the Hbuy_item objects in this menu
	get_item_list() {
		return this.data.dfs((node, data) => {
			if (node.degree() === 0) {
				data.push(node.data);
			}

			return data;
		});
	}

	// Return a deterministically ordered array of all the section labels of this menu
	get_section_list() {
		return this.data.dfs((node, data) => {
			if (node.degree() > 0) {
				data.push(node.data);
			}

			return data;
		});
	}

	// TODO: Add functions for inserting/deleting sections and items
}

module.exports.Hbuy_menu = Hbuy_menu;