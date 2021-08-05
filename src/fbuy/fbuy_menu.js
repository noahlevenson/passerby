/** 
* FBUY_MENU
* A food menu, serializable to plain values
* for wire transmission and compatibility with clients
* 
* 
* 
*/ 

"use strict";

const { Fbuy_pment } = require("./pment/fbuy_pment.js");
const { Fbuy_ffment } = require("./fbuy_ffment.js");
const { Fntree } = require("../ftypes/fntree/fntree.js");
const { Fntree_node } = require("../ftypes/fntree/fntree_node.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js");

class Fbuy_menu {
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
    pments = [Fbuy_pment.TYPE.CASH, Fbuy_pment.TYPE.AMEX, Fbuy_pment.TYPE.VISA, Fbuy_pment.TYPE.MC], 
    keywords = [], 
    taxes = [],
    ffments = null,
    data = null
  } = {}) {
    if (data === null) {
      this.data = new Fntree(new Fntree_node({data: name}));
    } else if (data instanceof Fntree) {
      this.data = data;
    } else {
      this.data = Fntree.from_json(data);
    }

    this.ffments = ffments === null ? 
      Object.fromEntries(Object.values(Fbuy_ffment.DEFAULT).map((ffment, i) => {
        return [i, ffment];
      })) : Object.fromEntries(Object.entries(ffments).map((ffment) => {
        return [ffment[0], new Fbuy_ffment(ffment[1])]
      }));

    this.pments = pments;
    this.keywords = keywords;
    this.taxes = taxes;
  }

  // Factory function, construct from on-disk serialized format
  static from_json(json) {
    return new this(JSON.parse(json));
  }

  // Determine whether an fbuy_menu object is in a frozen or unfrozen state
  static is_frozen(fbuy_menu) {
    if (fbuy_menu.data instanceof Fntree) {
      return false;
    }

    return true;
  }

  // TODO: move me to an Fbuy_form class and make Fbuy_form_menu a subclass
  static get_form_id(fbuy_menu) {
    if (Fbuy_menu.is_frozen(fbuy_menu)) {
      return Fcrypto.sha1(JSON.stringify(fbuy_menu.data));
    }

    return Fcrypto.sha1(JSON.stringify(fbuy_menu.get_node_list()));
  }

  // For an unfrozen tree, get its menu node list flattened as an array
  get_node_list() {
    return this.data.dfs((node, data) => {
      data.push(node.data);
    });
  }

  // Factory function to create a "frozen" menu from a non-frozen menu
  // a frozen menu is a plain valued JSON object with its tree flattened into an array
  // TODO: this is shallow copy, could give you some trouble
  freeze() {
    return Object.assign({}, this, {data: this.get_node_list()});
  }

  // TODO: Functions for inserting/deleting sections and items?
}

module.exports.Fbuy_menu = Fbuy_menu;
