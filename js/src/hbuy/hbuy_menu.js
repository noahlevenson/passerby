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

class Hbuy_menu {
	data;
	min_order;
	taxes;

	constructor({name = "Untitled", min_order = 0.00, taxes = []} = {}) {
		this.data = new Hntree(new Hntree_node({data: name}));
		this.min_order = min_order;
		this.taxes = taxes;
	}

	get_items() {
		return this.data.dfs((node, data) => {
			if (node.num_children() === 0) {
				data.push(node.data);
			}

			return data;
		});
	}

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