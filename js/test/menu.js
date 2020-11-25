const { Hbuy_menu } = require("../src/hbuy/hbuy_menu.js");
const { Hbuy_tax } = require("../src/hbuy/hbuy_tax.js");
const { Hntree_node } = require("../src/htypes/hntree/hntree_node.js");
const { Hbuy_item } = require("../src/hbuy/hbuy_item.js");
const { Hbuy_item_size } = require("../src/hbuy/hbuy_item_size.js");
const { Hbuy_item_cust_cat } = require("../src/hbuy/hbuy_item_cust_cat.js");
const { Hbuy_item_cust } = require("../src/hbuy/hbuy_item_cust.js");

const Larosa_menu = new Hbuy_menu({
	name: "Pizzeria La Rosa Lunch/Dinner Menu",
	taxes: [new Hbuy_tax({desc: "TAX", rate: 0.08375})],
	keywords: [Hbuy_menu.KEYWORDS.Pizza, Hbuy_menu.KEYWORDS.Italian]
});

const toppings = new Hbuy_item_cust_cat({
	desc: "Toppings", 
	custs:[
		new Hbuy_item_cust({desc: "Pepperoni", price: 3.00}),
		new Hbuy_item_cust({desc: "Sausage", price: 3.00}),
		new Hbuy_item_cust({desc: "Meatballs", price: 3.00}),
		new Hbuy_item_cust({desc: "Anchovies", price: 3.00}),
		new Hbuy_item_cust({desc: "Ricotta", price: 3.00}),
		new Hbuy_item_cust({desc: "Extra mozzarella", price: 3.00}),
		new Hbuy_item_cust({desc: "Roasted peppers", price: 3.00}),
		new Hbuy_item_cust({desc: "Eggplant", price: 3.00}),
		new Hbuy_item_cust({desc: "Calabrian chili", price: 3.00}),
		new Hbuy_item_cust({desc: "Olives", price: 3.00}),
		new Hbuy_item_cust({desc: "Mushrooms", price: 2.00}),
		new Hbuy_item_cust({desc: "Onions", price: 2.00}),
		new Hbuy_item_cust({desc: "Caramelized onions", price: 2.00}),
		new Hbuy_item_cust({desc: "Kale", price: 2.00}),
		new Hbuy_item_cust({desc: "Garlic confit", price: 2.00}),
		new Hbuy_item_cust({desc: "Roasted potatoes", price: 2.00})
	]
});

const pizza_section = Larosa_menu.data.get_root().add_child(new Hntree_node({parent: Larosa_menu.data.get_root(), data: "Pizza"}));

const margherita_pie = pizza_section.add_child(new Hntree_node({parent: pizza_section, data: new Hbuy_item({name: "Margherita", desc: "Tomato sauce, house made mozzarella, basil", sizes: [new Hbuy_item_size({price: 15.00, cust_cats: [toppings]})]})}));
const white_pie = pizza_section.add_child(new Hntree_node({parent: pizza_section, data: new Hbuy_item({name: "White", desc: "House made mozzarella, ricotta, pecorino, caramelized onions, sesame seeds", sizes: [new Hbuy_item_size({price: 18.00, cust_cats: [toppings]})]})}));
const meatball_pie = pizza_section.add_child(new Hntree_node({parent: pizza_section, data: new Hbuy_item({name: "Meatball", desc: "House made mozzarella, ricotta, Pat La Frieda meatballs", sizes: [new Hbuy_item_size({price: 18.00, cust_cats: [toppings]})]})}));
const veggie_pie = pizza_section.add_child(new Hntree_node({parent: pizza_section, data: new Hbuy_item({name: "Veggie", desc: "House made mozzarella, fresh seasonal vegetables", sizes: [new Hbuy_item_size({price: 18.00, cust_cats: [toppings]})]})}));
const vodka_pie = pizza_section.add_child(new Hntree_node({parent: pizza_section, data: new Hbuy_item({name: "Vodka", desc: "Vodka cream sauce with essence of smoked bacon, house made mozzarella", sizes: [new Hbuy_item_size({price: 15.00, cust_cats: [toppings]})]})}));

const salad_section = Larosa_menu.data.get_root().add_child(new Hntree_node({parent: Larosa_menu.data.get_root(), data: "Salads"}));

const arugula_salad = salad_section.add_child(new Hntree_node({
	parent: salad_section,
	data: new Hbuy_item({
		name: "Arugula", 
		desc: "Roasted chickpeas, macerated raisins, pickled fennel, lemon confit vinaigrette, shaved pecorino",
		sizes: [
			new Hbuy_item_size({desc: "large", price: 10.00}),
			new Hbuy_item_size({desc: "family", price: 18.00})
		]
})}));

const romaine_salad = salad_section.add_child(new Hntree_node({
	parent: salad_section,
	data: new Hbuy_item({
		name: "Romaine", 
		desc: "The pizzeria classic: oven roasted cherry tomatoes, green olives, red onions, pepperoncini, red wine vinaigrette",
		sizes: [
			new Hbuy_item_size({desc: "large", price: 10.00}),
			new Hbuy_item_size({desc: "family", price: 18.00})
		]
})}));

const plates_section = Larosa_menu.data.get_root().add_child(new Hntree_node({parent: Larosa_menu.data.get_root(), data: "Plates"}));

const rigatoni_vodka = plates_section.add_child(new Hntree_node({
	parent: plates_section,
	data: new Hbuy_item({
		name: "Rigatoni vodka",
		desc: "Rigatoni in vodka sauce with smoked bacon and peas, side of pizza bianco",
		sizes: [
			new Hbuy_item_size({price: 13.00})
		]
	})
}));

const chicken_parm = plates_section.add_child(new Hntree_node({
	parent: plates_section,
	data: new Hbuy_item({
		name: "Chicken parm",
		desc: "24-hour brine organic free range Bell & Evans thigh, spicy tomato sauce",
		sizes: [
			new Hbuy_item_size({
				price: 15.00, 
				cust_cats: [
					new Hbuy_item_cust_cat({
						desc: "Options",
						custs: [
							new Hbuy_item_cust({
								desc: "Add pasta",
								price: 4.00
							})
						]
					})
				]})
		]
	})
}));

const eggplant_parm = plates_section.add_child(new Hntree_node({
	parent: plates_section,
	data: new Hbuy_item({
		name: "Eggplant parm",
		desc: "Three layers of eggplant, tomato sauce, mozzarella",
		sizes: [
			new Hbuy_item_size({
				price: 14.00, 
				cust_cats: [
					new Hbuy_item_cust_cat({
						desc: "Options",
						custs: [
							new Hbuy_item_cust({
								desc: "Add pasta",
								price: 4.00
							})
						]
					})
				]})
		]
	})
}));

const drinks_section = Larosa_menu.data.get_root().add_child(new Hntree_node({parent: Larosa_menu.data.get_root(), data: "Drinks"}));

const sodas_juce_and_tea_section = drinks_section.add_child(new Hntree_node({parent: drinks_section, data: "Sodas, juice & tea"}));

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

module.exports.Larosa_menu = Larosa_menu;
