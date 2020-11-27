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
ffments[Hbuy_ffment.TYPE.PICKUP] = new Hbuy_ffment({type: Hbuy_ffment.TYPE.PICKUP, min: 0.00, radius: Number.POSITIVE_INFINITY, est: 30})
ffments[Hbuy_ffment.TYPE.DELIVERY] = new Hbuy_ffment({type: Hbuy_ffment.TYPE.DELIVERY, min: 30.00, radius: 2.0, est: 60});

const Alvin_friends_dinner_menu = new Hbuy_menu({
	name: "Alvin & Friends",
	taxes: [new Hbuy_tax({desc: "TAX", rate: 0.08375})],
	pments: [Hbuy_pment.TYPE.CASH, Hbuy_pment.TYPE.MC, Hbuy_pment.TYPE.VISA],
	ffments: ffments,
	keywords: [Hbuy_menu.KEYWORDS.American, Hbuy_menu.KEYWORDS.Caribbean, Hbuy_menu.KEYWORDS.Burgers]
});

const burger_toppings = new Hbuy_item_cust_cat({
	desc: "Toppings", 
	custs:[
		new Hbuy_item_cust({desc: "Cheese", price: 1.50}),
		new Hbuy_item_cust({desc: "Bacon", price: 2.00}),
		new Hbuy_item_cust({desc: "Mushrooms", price: 2.50})
	]
});

const salads_section = Alvin_friends_dinner_menu.data.get_root().add_child(new Hntree_node({parent: Alvin_friends_dinner_menu.data.get_root(), data: "Salads"}));

const quinoa_basil_pesto = salads_section.add_child(new Hntree_node({parent: salads_section, data: new Hbuy_item({name: "Quinoa Basil Pesto Salad", desc: "Fresh mozzarella, tomatoes, cucumbers, lemon herb vinaigrette", sizes: [new Hbuy_item_size({price: 14.00, cust_cats: []})]})}));
const avocado_black_bean = salads_section.add_child(new Hntree_node({parent: salads_section, data: new Hbuy_item({name: "Avocado & Black Bean Salad", desc: "Field greens, roasted corn, grape tomatoes", sizes: [new Hbuy_item_size({desc: "No protein", price: 13.00, cust_cats: []}), new Hbuy_item_size({desc: "With grilled chicken", price: 22.00, cust_cats: []}), new Hbuy_item_size({desc: "With shrimp", price: 25.00, cust_cats: []}), new Hbuy_item_size({desc: "With salmon", price: 27.00, cust_cats: []})]})}));

const sandwiches_section = Alvin_friends_dinner_menu.data.get_root().add_child(new Hntree_node({parent: Alvin_friends_dinner_menu.data.get_root(), data: "Sandwiches & Burgers"}));

const trini_doubles = sandwiches_section.add_child(new Hntree_node({parent: sandwiches_section, data: new Hbuy_item({name: "Trini Doubles", desc: "", sizes: [new Hbuy_item_size({desc: "With chickpeas", price: 7.00, cust_cats: []}), new Hbuy_item_size({desc: "With chickpeas & chicken", price: 11.00, cust_cats: []})]})}));
const burger = sandwiches_section.add_child(new Hntree_node({parent: sandwiches_section, data: new Hbuy_item({name: "Alvin's 8 oz. Burger and French Fries", desc: "Served with French fries", sizes: [new Hbuy_item_size({price: 12.00, cust_cats: [burger_toppings]})]})}));

const entrees_section = Alvin_friends_dinner_menu.data.get_root().add_child(new Hntree_node({parent: Alvin_friends_dinner_menu.data.get_root(), data: "Entrees"}));

const catfish = entrees_section.add_child(new Hntree_node({parent: entrees_section, data: new Hbuy_item({name: "Cornmeal Fried Catfish", desc: "With stone-ground grits and black-eyed peas, topped with Creole remoulade", sizes: [new Hbuy_item_size({price: 26.00, cust_cats: []})]})}));
const jambalaya = entrees_section.add_child(new Hntree_node({parent: entrees_section, data: new Hbuy_item({name: "Classic Jambalaya", desc: "Rice, Andouille sausage, Tasso ham, blackened chicken, crawfish tails, Cajun spices, tangy Creole sauce", sizes: [new Hbuy_item_size({price: 25.00, cust_cats: []})]})}));
const oxtail = entrees_section.add_child(new Hntree_node({parent: entrees_section, data: new Hbuy_item({name: "Slow-Simmered Oxtail", desc: "With coconut rice and peas, piklis", sizes: [new Hbuy_item_size({price: 29.00, cust_cats: []})]})}));
const fried_chicken = entrees_section.add_child(new Hntree_node({parent: entrees_section, data: new Hbuy_item({name: "Buttermilk Fried Chicken", desc: "With slow-cooked greens, four-cheese mac & cheese. Add $3 for all white or all dark meat.", sizes: [new Hbuy_item_size({desc: "Mixed", price: 26.00, cust_cats: []}), new Hbuy_item_size({desc: "All white meat", price: 29.00, cust_cats: []}), new Hbuy_item_size({desc: "All dark meat", price: 29.00, cust_cats: []})]})}));

const desserts_section = Alvin_friends_dinner_menu.data.get_root().add_child(new Hntree_node({parent: Alvin_friends_dinner_menu.data.get_root(), data: "Desserts"}));

const pecan_pie = desserts_section.add_child(new Hntree_node({parent: desserts_section, data: new Hbuy_item({name: "Warm Pecan Pie", sizes: [new Hbuy_item_size({price: 8.00, cust_cats: []})]})}));
const chocolate_banana_bread = desserts_section.add_child(new Hntree_node({parent: desserts_section, data: new Hbuy_item({name: "Vegan Chocolate Banana Bread", sizes: [new Hbuy_item_size({price: 12.00, cust_cats: []})]})}));
const sorrel_cheesecake = desserts_section.add_child(new Hntree_node({parent: desserts_section, data: new Hbuy_item({name: "Sorrel Cheesecake", sizes: [new Hbuy_item_size({price: 9.00, cust_cats: []})]})}));
const chocolate_cake = desserts_section.add_child(new Hntree_node({parent: desserts_section, data: new Hbuy_item({name: "Double Chocolate Cake", sizes: [new Hbuy_item_size({price: 8.50, cust_cats: []})]})}));
const carrot_cake = desserts_section.add_child(new Hntree_node({parent: desserts_section, data: new Hbuy_item({name: "Carrot Cake", sizes: [new Hbuy_item_size({price: 11.00, cust_cats: []})]})}));

module.exports.Alvin_friends_dinner_menu = Alvin_friends_dinner_menu;
