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
ffments[Hbuy_ffment.TYPE.PICKUP] = new Hbuy_ffment({type: Hbuy_ffment.TYPE.PICKUP, min: 0.00, radius: Number.POSITIVE_INFINITY, est: 15})
ffments[Hbuy_ffment.TYPE.DELIVERY] = new Hbuy_ffment({type: Hbuy_ffment.TYPE.DELIVERY, min: 20.00, radius: 2.0, est: 40});

const Cantina_dinner_menu = new Hbuy_menu({
	name: "Cantina Lobos",
	taxes: [new Hbuy_tax({desc: "TAX", rate: 0.08375})],
	pments: [Hbuy_pment.TYPE.CASH, Hbuy_pment.TYPE.MC, Hbuy_pment.TYPE.VISA],
	ffments: ffments,
	keywords: [Hbuy_menu.KEYWORDS.Mexican, Hbuy_menu.KEYWORDS["Latin American"]]
});

const platos_pequenos_section = Cantina_dinner_menu.data.get_root().add_child(new Hntree_node({parent: Cantina_dinner_menu.data.get_root(), data: "Platos Pequeños"}));

const guac_and_chips = platos_pequenos_section.add_child(new Hntree_node({parent: platos_pequenos_section, data: new Hbuy_item({name: "Guacamole & Chips", desc: "house-made guacamole & milpa corn tortillas", sizes: [new Hbuy_item_size({price: 12.00, cust_cats: []})]})}));
const jumbo_tequila_shrimp = platos_pequenos_section.add_child(new Hntree_node({parent: platos_pequenos_section, data: new Hbuy_item({name: "Jumbo Tequila Shrimp", desc: "seared shrimp in a tequila lime butter sauce", sizes: [new Hbuy_item_size({price: 16.00, cust_cats: []})]})}));
const pulpo = platos_pequenos_section.add_child(new Hntree_node({parent: platos_pequenos_section, data: new Hbuy_item({name: "Pulpo Ala Plancha", desc: "spanish octopus, cannellini beans, tomatoes & colombian chorizo", sizes: [new Hbuy_item_size({price: 16.00, cust_cats: []})]})}));
const taquitos = platos_pequenos_section.add_child(new Hntree_node({parent: platos_pequenos_section, data: new Hbuy_item({name: "Chicken & Cheese Taquitos", desc: "grilled chicken breast & cheese rolled in flour tortillas and flash-fried with chipotle crema and smoked paprika", sizes: [new Hbuy_item_size({price: 13.00, cust_cats: []})]})}));

const tacos_section = Cantina_dinner_menu.data.get_root().add_child(new Hntree_node({parent: Cantina_dinner_menu.data.get_root(), data: "Los Tacos"}));

const pork_pastor = platos_pequenos_section.add_child(new Hntree_node({parent: tacos_section, data: new Hbuy_item({name: "Pork Pastor", desc: "seared pork marinated in guajillo & pineapple sauce, topped with cilantro, onion, pineapple & salsa fresca", sizes: [new Hbuy_item_size({price: 5.00, cust_cats: []})]})}));
const chx_tinga = platos_pequenos_section.add_child(new Hntree_node({parent: tacos_section, data: new Hbuy_item({name: "Chicken Tinga", desc: "shredded chicken marinated in a medium-spicy tinga sauce topped with onions & cilantro", sizes: [new Hbuy_item_size({price: 4.00, cust_cats: []})]})}));
const duck_confit = platos_pequenos_section.add_child(new Hntree_node({parent: tacos_section, data: new Hbuy_item({name: "Duck Confit", desc: "duck confit, chipotle-hoisin sauce, scallions & shaved jalapeño on a flour tortilla", sizes: [new Hbuy_item_size({price: 5.00, cust_cats: []})]})}));

const platos_grandes_section = Cantina_dinner_menu.data.get_root().add_child(new Hntree_node({parent: Cantina_dinner_menu.data.get_root(), data: "Platos Grandes"}));

const enchiladas = platos_pequenos_section.add_child(new Hntree_node({parent: platos_grandes_section, data: new Hbuy_item({name: "Enchiladas Rojas", desc: "served with cantina rice & beans", sizes: [new Hbuy_item_size({desc: "chicken", price: 19.00, cust_cats: []}), new Hbuy_item_size({desc: "shrimp", price: 19.00, cust_cats: []}), new Hbuy_item_size({desc: "flank steak", price: 20.00, cust_cats: []}), new Hbuy_item_size({desc: "Impossible Meat", price: 20.00, cust_cats: []})]})}));
const chx_mole = platos_pequenos_section.add_child(new Hntree_node({parent: platos_grandes_section, data: new Hbuy_item({name: "Chicken Mole", desc: "grilled chicken in a 12-hour mole sauce. served with rice & refried beans", sizes: [new Hbuy_item_size({price: 20.00, cust_cats: []})]})}));
const steak = platos_pequenos_section.add_child(new Hntree_node({parent: platos_grandes_section, data: new Hbuy_item({name: "Grilled Skirt Steak Asado", desc: "served with cantina rice & beans", sizes: [new Hbuy_item_size({price: 20.00, cust_cats: []})]})}));

const sides_section = Cantina_dinner_menu.data.get_root().add_child(new Hntree_node({parent: Cantina_dinner_menu.data.get_root(), data: "Accompañamientos"}));

const rice = sides_section.add_child(new Hntree_node({parent: sides_section, data: new Hbuy_item({name: "Spanish Rice", sizes: [new Hbuy_item_size({price: 5.00, cust_cats: []})]})}));
const beans = sides_section.add_child(new Hntree_node({parent: sides_section, data: new Hbuy_item({name: "Cantina Black Beans", sizes: [new Hbuy_item_size({price: 5.00, cust_cats: []})]})}));
const corn = sides_section.add_child(new Hntree_node({parent: sides_section, data: new Hbuy_item({name: "Mexican Corn on the Cob", sizes: [new Hbuy_item_size({price: 5.00, cust_cats: []})]})}));
const plantains = sides_section.add_child(new Hntree_node({parent: sides_section, data: new Hbuy_item({name: "Plantains", sizes: [new Hbuy_item_size({price: 5.00, cust_cats: []})]})}));

module.exports.Cantina_dinner_menu = Cantina_dinner_menu;
