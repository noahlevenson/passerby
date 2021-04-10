const { Fbuy_menu } = require("../src/fbuy/fbuy_menu.js");
const { Fbuy_pment } = require("../src/fbuy/pment/fbuy_pment.js");
const { Fbuy_ffment } = require("../src/fbuy/fbuy_ffment.js");
const { Fbuy_tax } = require("../src/fbuy/fbuy_tax.js");
const { Fntree_node } = require("../src/ftypes/fntree/fntree_node.js");
const { Fbuy_item } = require("../src/fbuy/fbuy_item.js");
const { Fbuy_item_size } = require("../src/fbuy/fbuy_item_size.js");
const { Fbuy_item_cust_cat } = require("../src/fbuy/fbuy_item_cust_cat.js");
const { Fbuy_item_cust } = require("../src/fbuy/fbuy_item_cust.js");

const ffments = {};
ffments[Fbuy_ffment.TYPE.PICKUP] = new Fbuy_ffment({type: Fbuy_ffment.TYPE.PICKUP, min: 0.00, radius: Number.POSITIVE_INFINITY, est: 10})
ffments[Fbuy_ffment.TYPE.DELIVERY] = new Fbuy_ffment({type: Fbuy_ffment.TYPE.DELIVERY, min: 10.00, radius: 2.0, est: 20});

const Toms_hot_dogs_menu = new Fbuy_menu({
	name: "Tom's Hot Dogs",
	taxes: [new Fbuy_tax({desc: "TAX", rate: 0.08375})],
	pments: [Fbuy_pment.TYPE.CASH],
	ffments: ffments,
	keywords: [Fbuy_menu.KEYWORDS.American]
});

const toppings = new Fbuy_item_cust_cat({
	desc: "Fixins", 
	custs:[
		new Fbuy_item_cust({desc: "Mustard", price: 0.00}),
		new Fbuy_item_cust({desc: "Ketchup", price: 0.00}),
		new Fbuy_item_cust({desc: "Sauerkraut", price: 0.00}),
		new Fbuy_item_cust({desc: "Onions", price: 0.00}),
	]
});

const hot_dogs_section = Toms_hot_dogs_menu.data.get_root().add_child(new Fntree_node({parent: Toms_hot_dogs_menu.data.get_root(), data: "Hot Dogs"}));

const hot_dog = hot_dogs_section.add_child(new Fntree_node({parent: hot_dogs_section, data: new Fbuy_item({name: "Hot Dog", desc: "100% all-beef frankfurter", sizes: [new Fbuy_item_size({price: 3.00, cust_cats: [toppings]})]})}));
const veggie_dog = hot_dogs_section.add_child(new Fntree_node({parent: hot_dogs_section, data: new Fbuy_item({name: "Veggie Dog", desc: "Tom's famous veggie dog", sizes: [new Fbuy_item_size({price: 4.00, cust_cats: [toppings]})]})}));

const sides = Toms_hot_dogs_menu.data.get_root().add_child(new Fntree_node({parent: Toms_hot_dogs_menu.data.get_root(), data: "Sides"}));

const curly_fries = sides.add_child(new Fntree_node({
	parent: sides,
	data: new Fbuy_item({
		name: "Curly fries", 
		desc: "Cooked in 100% pure peanut oil",
		sizes: [
			new Fbuy_item_size({desc: "small", price: 3.00}),
			new Fbuy_item_size({desc: "large", price: 5.00})
		]
})}));

const baked_beans = sides.add_child(new Fntree_node({
	parent: sides,
	data: new Fbuy_item({
		name: "Baked beans", 
		desc: "Grandma's recipe",
		sizes: [
			new Fbuy_item_size({desc: "small", price: 4.00}),
			new Fbuy_item_size({desc: "large", price: 6.00})
		]
})}));

const drinks_section = Toms_hot_dogs_menu.data.get_root().add_child(new Fntree_node({parent: Toms_hot_dogs_menu.data.get_root(), data: "Beverages"}));

const coke = drinks_section.add_child(new Fntree_node({
	parent: drinks_section,
	data: new Fbuy_item({
		name: "Coke",
		sizes: [
			new Fbuy_item_size({
				price: 3.00})
		]
	})
}));

const diet_coke = drinks_section.add_child(new Fntree_node({
	parent: drinks_section,
	data: new Fbuy_item({
		name: "Diet Coke",
		sizes: [
			new Fbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const sprite = drinks_section.add_child(new Fntree_node({
	parent: drinks_section,
	data: new Fbuy_item({
		name: "Sprite",
		sizes: [
			new Fbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const ginger_ale = drinks_section.add_child(new Fntree_node({
	parent: drinks_section,
	data: new Fbuy_item({
		name: "Ginger ale",
		sizes: [
			new Fbuy_item_size({
				price: 3.00
			})
		]
	})
}));

module.exports.Toms_hot_dogs_menu = Toms_hot_dogs_menu;
