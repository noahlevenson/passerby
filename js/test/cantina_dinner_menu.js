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
ffments[Fbuy_ffment.TYPE.PICKUP] = new Fbuy_ffment({type: Fbuy_ffment.TYPE.PICKUP, min: 0.00, radius: Number.POSITIVE_INFINITY, est: 15})
ffments[Fbuy_ffment.TYPE.DELIVERY] = new Fbuy_ffment({type: Fbuy_ffment.TYPE.DELIVERY, min: 20.00, radius: 2.0, est: 40});

const Cantina_dinner_menu = new Fbuy_menu({
	name: "Cantina Lobos",
	taxes: [new Fbuy_tax({desc: "TAX", rate: 0.08375})],
	pments: [Fbuy_pment.TYPE.CASH, Fbuy_pment.TYPE.MC, Fbuy_pment.TYPE.VISA],
	ffments: ffments,
	keywords: [Fbuy_menu.KEYWORDS.Mexican, Fbuy_menu.KEYWORDS["Latin American"]]
});

const platos_pequenos_section = Cantina_dinner_menu.data.get_root().add_child(new Fntree_node({parent: Cantina_dinner_menu.data.get_root(), data: "Platos Pequeños"}));

const guac_and_chips = platos_pequenos_section.add_child(new Fntree_node({parent: platos_pequenos_section, data: new Fbuy_item({name: "Guacamole & Chips", desc: "house-made guacamole & milpa corn tortillas", sizes: [new Fbuy_item_size({price: 12.00, cust_cats: []})]})}));
const jumbo_tequila_shrimp = platos_pequenos_section.add_child(new Fntree_node({parent: platos_pequenos_section, data: new Fbuy_item({name: "Jumbo Tequila Shrimp", desc: "seared shrimp in a tequila lime butter sauce", sizes: [new Fbuy_item_size({price: 16.00, cust_cats: []})]})}));
const pulpo = platos_pequenos_section.add_child(new Fntree_node({parent: platos_pequenos_section, data: new Fbuy_item({name: "Pulpo Ala Plancha", desc: "spanish octopus, cannellini beans, tomatoes & colombian chorizo", sizes: [new Fbuy_item_size({price: 16.00, cust_cats: []})]})}));
const taquitos = platos_pequenos_section.add_child(new Fntree_node({parent: platos_pequenos_section, data: new Fbuy_item({name: "Chicken & Cheese Taquitos", desc: "grilled chicken breast & cheese rolled in flour tortillas and flash-fried with chipotle crema and smoked paprika", sizes: [new Fbuy_item_size({price: 13.00, cust_cats: []})]})}));

const tacos_section = Cantina_dinner_menu.data.get_root().add_child(new Fntree_node({parent: Cantina_dinner_menu.data.get_root(), data: "Los Tacos"}));

const pork_pastor = tacos_section.add_child(new Fntree_node({parent: tacos_section, data: new Fbuy_item({name: "Pork Pastor", desc: "seared pork marinated in guajillo & pineapple sauce, topped with cilantro, onion, pineapple & salsa fresca", sizes: [new Fbuy_item_size({price: 5.00, cust_cats: []})]})}));
const chx_tinga = tacos_section.add_child(new Fntree_node({parent: tacos_section, data: new Fbuy_item({name: "Chicken Tinga", desc: "shredded chicken marinated in a medium-spicy tinga sauce topped with onions & cilantro", sizes: [new Fbuy_item_size({price: 4.00, cust_cats: []})]})}));
const duck_confit = tacos_section.add_child(new Fntree_node({parent: tacos_section, data: new Fbuy_item({name: "Duck Confit", desc: "duck confit, chipotle-hoisin sauce, scallions & shaved jalapeño on a flour tortilla", sizes: [new Fbuy_item_size({price: 5.00, cust_cats: []})]})}));

const platos_grandes_section = Cantina_dinner_menu.data.get_root().add_child(new Fntree_node({parent: Cantina_dinner_menu.data.get_root(), data: "Platos Grandes"}));

const enchiladas = platos_grandes_section.add_child(new Fntree_node({parent: platos_grandes_section, data: new Fbuy_item({name: "Enchiladas Rojas", desc: "served with cantina rice & beans", sizes: [new Fbuy_item_size({desc: "chicken", price: 19.00, cust_cats: []}), new Fbuy_item_size({desc: "shrimp", price: 19.00, cust_cats: []}), new Fbuy_item_size({desc: "flank steak", price: 20.00, cust_cats: []}), new Fbuy_item_size({desc: "Impossible Meat", price: 20.00, cust_cats: []})]})}));
const chx_mole = platos_grandes_section.add_child(new Fntree_node({parent: platos_grandes_section, data: new Fbuy_item({name: "Chicken Mole", desc: "grilled chicken in a 12-hour mole sauce. served with rice & refried beans", sizes: [new Fbuy_item_size({price: 20.00, cust_cats: []})]})}));
const steak = platos_grandes_section.add_child(new Fntree_node({parent: platos_grandes_section, data: new Fbuy_item({name: "Grilled Skirt Steak Asado", desc: "served with cantina rice & beans", sizes: [new Fbuy_item_size({price: 20.00, cust_cats: []})]})}));

const sides_section = Cantina_dinner_menu.data.get_root().add_child(new Fntree_node({parent: Cantina_dinner_menu.data.get_root(), data: "Accompañamientos"}));

const rice = sides_section.add_child(new Fntree_node({parent: sides_section, data: new Fbuy_item({name: "Spanish Rice", sizes: [new Fbuy_item_size({price: 5.00, cust_cats: []})]})}));
const beans = sides_section.add_child(new Fntree_node({parent: sides_section, data: new Fbuy_item({name: "Cantina Black Beans", sizes: [new Fbuy_item_size({price: 5.00, cust_cats: []})]})}));
const corn = sides_section.add_child(new Fntree_node({parent: sides_section, data: new Fbuy_item({name: "Mexican Corn on the Cob", sizes: [new Fbuy_item_size({price: 5.00, cust_cats: []})]})}));
const plantains = sides_section.add_child(new Fntree_node({parent: sides_section, data: new Fbuy_item({name: "Plantains", sizes: [new Fbuy_item_size({price: 5.00, cust_cats: []})]})}));

module.exports.Cantina_dinner_menu = Cantina_dinner_menu;
