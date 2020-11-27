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
ffments[Hbuy_ffment.TYPE.PICKUP] = new Hbuy_ffment({type: Hbuy_ffment.TYPE.PICKUP, min: 0.00, radius: Number.POSITIVE_INFINITY, est: 25})
ffments[Hbuy_ffment.TYPE.DELIVERY] = new Hbuy_ffment({type: Hbuy_ffment.TYPE.DELIVERY, min: 15.00, radius: 2.0, est: 35});

const Rocnramen_menu = new Hbuy_menu({
	name: "Roc N Ramen",
	taxes: [new Hbuy_tax({desc: "TAX", rate: 0.08375})],
	pments: [Hbuy_pment.TYPE.CASH, Hbuy_pment.TYPE.MC, Hbuy_pment.TYPE.VISA],
	ffments: ffments,
	keywords: [Hbuy_menu.KEYWORDS.Japanese]
});

const ramen_toppings = new Hbuy_item_cust_cat({
	desc: "Additional Toppings", 
	custs:[
		new Hbuy_item_cust({desc: "Corn", price: 1.00}),
		new Hbuy_item_cust({desc: "Bamboo Shoot", price: 1.00}),
		new Hbuy_item_cust({desc: "Baby Bok Choy", price: 1.00}),
		new Hbuy_item_cust({desc: "Shitake Mushrooms", price: 1.00}),
		new Hbuy_item_cust({desc: "Seasoned Boiled Egg", price: 1.00}),
		new Hbuy_item_cust({desc: "Chashu Pork", price: 2.00}),
		new Hbuy_item_cust({desc: "Broccoli", price: 1.00}),
		new Hbuy_item_cust({desc: "Butter", price: 1.00}),
		new Hbuy_item_cust({desc: "Tofu", price: 2.00}),
		new Hbuy_item_cust({desc: "Chicken", price: 2.00}),
	]
});

const appetizers_section = Rocnramen_menu.data.get_root().add_child(new Hntree_node({parent: Rocnramen_menu.data.get_root(), data: "Appetizers"}));

const edamame = appetizers_section.add_child(new Hntree_node({parent: appetizers_section, data: new Hbuy_item({name: "Edamame", desc: "Steamed non-GMO soybean pods tossed in sea salt", sizes: [new Hbuy_item_size({price: 6.00, cust_cats: []})]})}));
const gyoza = appetizers_section.add_child(new Hntree_node({parent: appetizers_section, data: new Hbuy_item({name: "Gyoza Dumpling", desc: "Your choice of ground chicken, pork, or vegetable topped with dumpling sauce, scallions, and sesame seeds", sizes: [new Hbuy_item_size({desc: "Chicken", price: 8.00, cust_cats: []}), new Hbuy_item_size({desc: "Pork", price: 8.00, cust_cats: []}), new Hbuy_item_size({desc: "Vegetable", price: 8.00, cust_cats: []})]})}));
const karaage = appetizers_section.add_child(new Hntree_node({parent: appetizers_section, data: new Hbuy_item({name: "Karaage w/Kale & Lemon Wedge", sizes: [new Hbuy_item_size({price: 10.00, cust_cats: []})]})}));

const ramen_section = Rocnramen_menu.data.get_root().add_child(new Hntree_node({parent: Rocnramen_menu.data.get_root(), data: "Ramen"}));

const oxtail = ramen_section.add_child(new Hntree_node({parent: ramen_section, data: new Hbuy_item({name: "Curried Oxtail Ramen", desc: "Noodles topped with curried oxtails, scallions, carrots, corn, egg, edible flowers, sesame seeds, fried onions, nori seaweed, tonkatsu/curry broth", sizes: [new Hbuy_item_size({price: 17.00, cust_cats: [ramen_toppings]})]})}));
const shoyu = ramen_section.add_child(new Hntree_node({parent: ramen_section, data: new Hbuy_item({name: "Shoyu Ramen", desc: "Noodles topped with 2 piece chashu (pork belly), scallions, bamboo shoots, egg, edible flowers, sesame seeds, fried onions, nori seaweed", sizes: [new Hbuy_item_size({price: 14.00, cust_cats: [ramen_toppings]})]})}));
const tonkatsu = ramen_section.add_child(new Hntree_node({parent: ramen_section, data: new Hbuy_item({name: "Tonkatsu Ramen", desc: "Noodles topped with 2 piece chashu (pork belly), scallions, bamboo shoots, egg, edible flowers, sesame seeds, fried onions, nori seaweed", sizes: [new Hbuy_item_size({price: 14.00, cust_cats: [ramen_toppings]})]})}));
const veg = ramen_section.add_child(new Hntree_node({parent: ramen_section, data: new Hbuy_item({name: "Vegetable Ramen", desc: "Vegetable broth with tofu, corn, bok choy, carrots, bamboo shoots, broccoli, mushrooms, edible flowers, egg, fried onions, sesame seeds, nori seaweed", sizes: [new Hbuy_item_size({price: 14.00, cust_cats: [ramen_toppings]})]})}));

const sodas_juce_and_tea_section = Rocnramen_menu.data.get_root().add_child(new Hntree_node({parent: Rocnramen_menu.data.get_root(), data: "Soft Drinks"}));

const ramune = sodas_juce_and_tea_section.add_child(new Hntree_node({parent: sodas_juce_and_tea_section, data: new Hbuy_item({name: "Ramune Japanese Soda", desc: "A fun traditional Japanese soda bottle-drop a barbel bead in the bottle.", sizes: [new Hbuy_item_size({desc: "Original", price: 4.00, cust_cats: []}), new Hbuy_item_size({desc: "Grape", price: 4.00, cust_cats: []}), new Hbuy_item_size({desc: "Orange", price: 4.00, cust_cats: []}), new Hbuy_item_size({desc: "Strawberry", price: 4.00, cust_cats: []}), new Hbuy_item_size({desc: "Melon", price: 4.00, cust_cats: []})]})}));

const coke = sodas_juce_and_tea_section.add_child(new Hntree_node({
	parent: sodas_juce_and_tea_section,
	data: new Hbuy_item({
		name: "Coke",
		sizes: [
			new Hbuy_item_size({
				price: 3.00})
		]
	})
}));

const diet_coke = sodas_juce_and_tea_section.add_child(new Hntree_node({
	parent: sodas_juce_and_tea_section,
	data: new Hbuy_item({
		name: "Diet Coke",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const sprite = sodas_juce_and_tea_section.add_child(new Hntree_node({
	parent: sodas_juce_and_tea_section,
	data: new Hbuy_item({
		name: "Sprite",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const ginger_ale = sodas_juce_and_tea_section.add_child(new Hntree_node({
	parent: sodas_juce_and_tea_section,
	data: new Hbuy_item({
		name: "Ginger ale",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const apple_juice = sodas_juce_and_tea_section.add_child(new Hntree_node({
	parent: sodas_juce_and_tea_section,
	data: new Hbuy_item({
		name: "Apple juice",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const iced_tea = sodas_juce_and_tea_section.add_child(new Hntree_node({
	parent: sodas_juce_and_tea_section,
	data: new Hbuy_item({
		name: "Iced tea",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

const lemonade = sodas_juce_and_tea_section.add_child(new Hntree_node({
	parent: sodas_juce_and_tea_section,
	data: new Hbuy_item({
		name: "Lemonade",
		sizes: [
			new Hbuy_item_size({
				price: 3.00
			})
		]
	})
}));

module.exports.Rocnramen_menu = Rocnramen_menu;
