/** 
* HBUY_MENU
* Class for an Hbuy menu
* HBUY_MENU objects serialize to 
* "plain values" for wire transmission
* and compatibility with clients, Redux, etc.
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

	constructor({name = "", min_order = 0.00, taxes = []} = {}) {
		// TODO: validation
		this.min_order = min_order;
		this.taxes = taxes;
		this.data = new Hntree(new Hntree_node({data: name}));
	}

	// Factory function for constructing from on-disk serialized format
	// TODO: write me!
	static from_json() {

	}

	// TODO: move me to an Hbuy_form class and make Hbuy_form_menu a subclass
	static get_form_id(hbuy_menu) {
		return Hutil._sha1(JSON.stringify(hbuy_menu.data));
	}

	// TODO: Add functions for inserting/deleting sections and items
}

module.exports.Hbuy_menu = Hbuy_menu;