const { Happ } = require("../src/happ/happ.js");
const { Happ_bboard } = require("../src/happ/happ_bboard.js");
const { Hid_pub } = require("../src/hid/hid_pub.js");
const { Happ_env } = require("../src/happ/happ_env.js");
const { Hgeo } = require("../src/hgeo/hgeo.js");
const { Hgeo_rect } = require("../src/hgeo/hgeo_rect.js");
const { Hgeo_coord } = require("../src/hgeo/hgeo_coord.js");
const { Hbuy_status } = require("../src/hbuy/hbuy_status.js");
const { Hbuy_menu } = require("../src/hbuy/hbuy_menu.js");
const { Hlog } = require("../src/hlog/hlog.js");
const { Hbigint } = Happ_env.BROWSER ? require("../src/htypes/hbigint/hbigint_browser.js") : require("../src/htypes/hbigint/hbigint_node.js");
const { Larosa_menu } = require("./menu.js");
const { Toms_hot_dogs_menu } = require("./toms_hot_dogs_menu.js");

(async function run() {
    const larosa = new Hid_pub({
        public_key: "debug_la_rosa_public_key",
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    const network = new Happ({hid_pub: larosa});
    await network.start();
    
    await network.put(new Happ_bboard({cred: "La Rosa CERT", form: Larosa_menu.freeze()}));
    
    const spumoni_gardens = new Hgeo_coord({lat: 40.5947235, long: -73.98131332751743});
    await network.hpht.insert(spumoni_gardens.linearize(), new Happ_bboard({cred: "L&B Spumoni Gardens CERT", form: Toms_hot_dogs_menu.freeze()}));

    const pinos = new Hgeo_coord({lat: 40.6713257, long: -73.9776937});
    await network.hpht.insert(pinos.linearize(), new Happ_bboard({cred: "Pino's La Forchetta CERT", form: Toms_hot_dogs_menu.freeze()}));

    const modern_pizza = new Hgeo_coord({lat: 40.9089094, long: -73.7842226});
    await network.hpht.insert(modern_pizza.linearize(), new Happ_bboard({cred: "Modern Pizzeria & Restaurant CERT", form: Toms_hot_dogs_menu.freeze()}));
    
    const ajs_burgers = new Hgeo_coord({lat: 40.9225513, long: -73.7880021});
    await network.hpht.insert(ajs_burgers.linearize(), new Happ_bboard({cred: "AJ's Burgers CERT", form: Toms_hot_dogs_menu.freeze()}));

    const fourbros = new Hgeo_coord({lat: 40.9074648, long: -73.7844935});
    await network.hpht.insert(fourbros.linearize(), new Happ_bboard({cred: "4 Bros Pizza CERT", form: Toms_hot_dogs_menu.freeze()}));

    const dubrovnik = new Hgeo_coord({lat: 40.9036258, long: -73.7913645});
    await network.hpht.insert(dubrovnik.linearize(), new Happ_bboard({cred: "Dubrovnik Restaurant CERT", form: Toms_hot_dogs_menu.freeze()}));
    console.log("Done!")
})();
