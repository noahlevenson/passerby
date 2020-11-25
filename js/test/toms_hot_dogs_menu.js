const { Hbuy_menu } = require("../src/hbuy/hbuy_menu.js");
const { Hbuy_pment } = require("../src/hbuy/pment/hbuy_pment.js");
const { Hbuy_ffment } = require("../src/hbuy/hbuy_ffment.js");
const { Hbuy_tax } = require("../src/hbuy/hbuy_tax.js");
const { Hntree_node } = require("../src/htypes/hntree/hntree_node.js");
const { Hbuy_item } = require("../src/hbuy/hbuy_item.js");
const { Hbuy_item_size } = require("../src/hbuy/hbuy_item_size.js");
const { Hbuy_item_cust_cat } = require("../src/hbuy/hbuy_item_cust_cat.js");
const { Hbuy_item_cust } = require("../src/hbuy/hbuy_item_cust.js");

const ffments = {};
ffments[Hbuy_ffment.TYPE.PICKUP] = new Hbuy_ffment({type: Hbuy_ffment.TYPE.PICKUP, min: 0.00, radius: Number.POSITIVE_INFINITY, est: 10})
ffments[Hbuy_ffment.TYPE.DELIVERY] = new Hbuy_ffment({type: Hbuy_ffment.TYPE.DELIVERY, min: 10.00, radius: 2.0, est: 20});

const Toms_hot_dogs_menu = new Hbuy_menu({
	name: "Tom's Hot Dogs",
	taxes: [new Hbuy_tax({desc: "TAX", rate: 0.08375})],
	pments: [Hbuy_pment.TYPE.CASH],
	ffments: ffments,
	keywords: [Hbuy_menu.KEYWORDS.American]
});

const toppings = new Hbuy_item_cust_cat({
	desc: "Fixins", 
	custs:[
		new Hbuy_item_cust({desc: "Mustard", price: 0.00}),
		new Hbuy_item_cust({desc: "Ketchup", price: 0.00}),
		new Hbuy_item_cust({desc: "Sauerkraut", price: 0.00}),
		new Hbuy_item_cust({desc: "Onions", price: 0.00}),
	]
});

const hot_dogs_section = Toms_hot_dogs_menu.data.get_root().add_child(new Hntree_node({parent: Toms_hot_dogs_menu.data.get_root(), data: "Hot Dogs"}));

const hot_dog = hot_dogs_section.add_child(new Hntree_node({parent: hot_dogs_section, data: new Hbuy_item({name: "Hot Dog", desc: "100% all-beef frankfurter", sizes: [new Hbuy_item_size({price: 3.00, cust_cats: [toppings]})]})}));
const veggie_dog = hot_dogs_section.add_child(new Hntree_node({parent: hot_dogs_section, data: new Hbuy_item({name: "Veggie Dog", desc: "Tom's famous veggie dog", sizes: [new Hbuy_item_size({price: 4.00, cust_cats: [toppings]})]})}));

const sides = Toms_hot_dogs_menu.data.get_root().add_child(new Hntree_node({parent: Toms_hot_dogs_menu.data.get_root(), data: "Sides"}));

const curly_fries = sides.add_child(new Hntree_node({
	parent: sides,
	data: new Hbuy_item({
		name: "Curly fries", 
		desc: "Cooked in 100% pure peanut oil",
		sizes: [
			new Hbuy_item_size({desc: "small", price: 3.00}),
			new Hbuy_item_size({desc: "large", price: 5.00})
		]
})}));

const baked_beans = sides.add_child(new Hntree_node({
	parent: sides,
	data: new Hbuy_item({
		name: "Baked beans", 
		desc: "Grandma's recipe",
		sizes: [
			new Hbuy_item_size({desc: "small", price: 4.00}),
			new Hbuy_item_size({desc: "large", price: 6.00})
		]
})}));

const drinks_section = Toms_hot_dogs_menu.data.get_root().add_child(new Hntree_node({parent: Toms_hot_dogs_menu.data.get_root(), data: "Beverages"}));

const coke = drinks_section.add_child(new Hntree_node({
	parent: drinks_section,
	data: new Hbuy_item({
		name: "Coke",
		sizes: [
			new Hbuy_item_size({
				price: 3.00})
		]
	})
}));

const diet_coke = drinks_section.add_child(new Hntree_node({
	parent: drinks_section,
	data: new Hbuy_item({
		name: "Diet Coke",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const sprite = drinks_section.add_child(new Hntree_node({
	parent: drinks_section,
	data: new Hbuy_item({
		name: "Sprite",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const ginger_ale = drinks_section.add_child(new Hntree_node({
	parent: drinks_section,
	data: new Hbuy_item({
		name: "Ginger ale",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

module.exports.Toms_hot_dogs_menu = Toms_hot_dogs_menu;
