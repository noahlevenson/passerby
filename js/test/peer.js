const { Happ } = require("../src/happ/happ.js");
const { Happ_env } = require("../src/happ/happ_env.js");
const { Hgeo_rect } = require("../src/hgeo/hgeo_rect.js");
const { Hgeo_coord } = require("../src/hgeo/hgeo_coord.js");
const { Hbuy_status } = require("../src/hbuy/hbuy_status.js");
const { Hlog } = require("../src/hlog/hlog.js");

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


    // network.hpht._debug_print_stats();
    // network.node._debug_print_routing_table();

    network.hbuy.transact_req({
        order: "debug",
        payment: "debug",
        addr: "66.228.34.29",
        port: 27500,
        success: (res, ctx) => {
            network.hbuy.on_status(res.data.id, Hbuy_status.CODE.CONFIRMED, (req) => {
                console.log(`Received confirmation for transaction # ${req.data.id.toString()}`);
            });
        },
        timeout: (req) => {
            console.log(`Transaction request ${req.data.id.toString()} timed out`);
        }
    });
})();
