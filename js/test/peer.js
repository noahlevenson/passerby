const { Happ } = require("../src/happ/happ.js");
const { Happ_env } = require("../src/happ/happ_env.js");
const { Hgeo_rect } = require("../src/hgeo/hgeo_rect.js");
const { Hgeo_coord } = require("../src/hgeo/hgeo_coord.js");
const { Hbuy } = require("../src/hbuy/hbuy.js");
const { Hbuy_msg } = require("../src/hbuy/hbuy_msg.js");
const { Hbigint } = Happ_env.BROWSER ? require("../src/htypes/hbigint/hbigint_browser.js") : require("../src/htypes/hbigint/hbigint_node.js");

(async function run() {
    const network = new Happ({lat: 40.9018663, long: -73.7912739});
    await network.start();
    await network.put("Pizzeria La Rosa MENU DATA");
    
    const westchester = new Hgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    
    // *** non-API functions -- PUTting menu data not associated with our geolocation...
    const spumoni_gardens = new Hgeo_coord({lat: 40.5947235, long: -73.98131332751743});
    await network.hpht.insert(spumoni_gardens.linearize(), "L&B Spumoni Gardens");

    const pinos = new Hgeo_coord({lat: 40.6713257, long: -73.9776937});
    await network.hpht.insert(pinos.linearize(), "Pino's La Forchetta");

    const modern_pizza = new Hgeo_coord({lat: 40.9089094, long: -73.7842226});
    await network.hpht.insert(modern_pizza.linearize(), "Modern Pizza & Restaurant");
    // ***

    const search_res = await network.geosearch(westchester);
    console.log(search_res);

    const purchase = new Hbuy_msg({
        from: "placeholder for hbuy_id",
        data: "here's where an Hbuy_transact would go",
        type: Hbuy_msg.TYPE.REQ,
        flavor: Hbuy_msg.FLAVOR.TRANSACT,
        id: Hbigint.random(Hbuy.ID_LEN)
    });

    network.hbuy.send(purchase, "66.228.34.29", 27500, (res, ctx) => {
        console.log(res);
    });

    network.hpht._debug_print_stats();
    network.node._debug_print_routing_table();
})();
