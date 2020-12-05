/** 
* HBUY_MENU
* Class for an Hbuy menu
* HBUY_MENU objects serialize to 
* "plain values" for wire transmission
* and compatibility with clients, Redux, etc.
* 
*/ 

"use strict";

const { Hbuy_pment } = require("./pment/hbuy_pment.js");
const { Hbuy_ffment } = require("./hbuy_ffment.js");
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
		"Burgers": 14,
		"American": 15
	};

	ffments;
	pments;
	keywords;
	taxes;
	data;
	
	constructor({
		name = "Untitled Menu",
		pments = [Hbuy_pment.TYPE.CASH, Hbuy_pment.TYPE.AMEX, Hbuy_pment.TYPE.VISA, Hbuy_pment.TYPE.MC], 
		keywords = [], 
		taxes = [],
		ffments = null,
		data = null
	} = {}) {
			if (data === null) {
				this.data = new Hntree(new Hntree_node({data: name}));
			} else if (data instanceof Hntree) {
				this.data = data;
			} else {
				this.data = Hntree.from_json(data);
			}

			this.ffments = ffments === null ? Object.fromEntries(Object.values(Hbuy_ffment.DEFAULT).map((ffment, i) => {
				return [i, ffment];
			})) : Object.fromEntries(Object.entries(ffments).map(ffment => return [ffment[0], new Hbuy_ffment(ffment[1])]));

			this.pments = pments;
			this.keywords = keywords;
			this.taxes = taxes;
	}

	// Factory function for constructing from on-disk serialized format
	static from_json(json) {
		return new this(JSON.parse(json));
	}

	// Determine whether an hbuy_menu object is in a frozen or unfrozen state
	static is_frozen(hbuy_menu) {
		if (hbuy_menu.data instanceof Hntree) {
			return false;
		}

		return true;
	}

	// TODO: move me to an Hbuy_form class and make Hbuy_form_menu a subclass
	static get_form_id(hbuy_menu) {
		if (Hbuy_menu.is_frozen(hbuy_menu)) {
			return Hutil._sha1(JSON.stringify(hbuy_menu.data));
		}

		return Hutil._sha1(JSON.stringify(hbuy_menu.get_node_list()));
	}

	// For an unfrozen tree, get its menu node list flattened as an array
	get_node_list() {
		return this.data.dfs((node, data) => {
			data.push(node.data);
		});
	}

	// Factory function to create a "frozen" menu from a non-frozen menu
	// a frozen menu is a plain valued JSON object with its tree flattened into an array
	// TODO: this is a shallow copy which references the nodes in the unfrozen menu's tree
	// this may give you some trouble...
	freeze() {
		return Object.assign({}, this, {data: this.get_node_list()});
	}

	// TODO: Add functions for inserting/deleting sections and items
}

module.exports.Hbuy_menu = Hbuy_menu;
