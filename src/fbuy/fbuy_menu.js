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

/**
 * A note about our friend the Fbuy_menu: to enable the construction of flexible WYSIWYG editors
 * for food menus, we decided to base the Fbuy_menu on a k-way tree. This decision was based in
 * part on the idea that you should be able to create all kinds of elaborately nested hierarchical
 * menus, with subheadings and subheadings of the subheadings and so on. 
 * 
 * At some point, we realized that it's epically difficult to write a menu renderer in a common 
 * frontend framework (e.g. React) when your menu is a tree, and that writing a menu renderer is 
 * exponentially easier when your menu is an array. Hence the introduction of the "freeze" concept; 
 * freezing a menu just collects its nodes as a flat array. Restaurants edit their menus as trees, 
 * but publish them frozen. Freezing introduces a lot of complexity and brittleness, and we feel 
 * sad about it.
 * 
 * Today, we realize that elaborately nested hierarchical menus are probably dumb anyway. How many
 * times do you really need to subdivide the "SOFT DRINKS" section? Besides, it seems inevitable 
 * that we'd have to cap menu tree depth at 3 or 4 so as to prevent people from making very deeply 
 * nested menus that create edge cases for weird window aspects/sizes. The big brain move might be 
 * to throw a TODO here to reconsider the tree-based Fbuy_menu entirely.
 */ 

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
      })) : Object.fromEntries(Object.entries(ffments).map((entry) => {
        const [ffment_name, ffment] = entry;
        return [ffment_name, new Fbuy_ffment(ffment)];
      }));

    this.pments = pments;
    this.keywords = keywords;
    this.taxes = taxes;
  }

  /**
   * Factory function to construct an Fbuy_menu from its JSON serialized form
   */ 
  static from_json(json) {
    return new this(JSON.parse(json));
  }

  /**
   * Is the specified Fbuy_menu in a frozen state?
   */ 
  static is_frozen(fbuy_menu) {
    if (fbuy_menu.data instanceof Fntree) {
      return false;
    }

    return true;
  }

  /**
   * Fetch the form ID for the specified Fbuy_menu. Form ID is just a hash value over the menu;
   * since peers send compact item references as orders (rather than the items themselves), form ID
   * enables buyers and sellers to ensure agreement on the data being referenced. TODO: this should 
   * be moved to an Fbuy_form base class, and Fbuy_menu should subclass it
   */
  static get_form_id(fbuy_menu) {
    if (Fbuy_menu.is_frozen(fbuy_menu)) {
      return Fcrypto.sha1(JSON.stringify(fbuy_menu.data));
    }

    return Fcrypto.sha1(JSON.stringify(fbuy_menu.get_node_list()));
  }

  /**
   * Assuming this menu is not frozen, fetch its menu node list as a flat array
   */ 
  get_node_list() {
    return this.data.dfs((node, data) => {
      data.push(node.data);
    });
  }

  /**
   * Factory function to create a frozen menu from a non-frozen menu. A frozen menu is a plain 
   * valued JSON object with its tree flattened into an array. TODO: this is shallow copy...
   */ 
  freeze() {
    return Object.assign({}, this, {data: this.get_node_list()});
  }
}

module.exports.Fbuy_menu = Fbuy_menu;
