const { Happ } = require("../src/happ/happ.js");
const { Hid_public_data } = require("../src/hid/hid_public_data.js");
const { Hid } = require("../src/hid/hid.js");
const { Happ_env } = require("../src/happ/happ_env.js");
const { Hgeo_rect } = require("../src/hgeo/hgeo_rect.js");
const { Hgeo_coord } = require("../src/hgeo/hgeo_coord.js");
const { Hbuy_status } = require("../src/hbuy/hbuy_status.js");
const { Hlog } = require("../src/hlog/hlog.js");
const { Hbigint } = Happ_env.BROWSER ? require("../src/htypes/hbigint/hbigint_browser.js") : require("../src/htypes/hbigint/hbigint_node.js");


(async function run() {
    const larosa = new Hid({
        public_key: "debug_la_rosa_public_key",
        private_key: "debug_la_rosa_private_key",
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    const network = new Happ({hid: larosa});
    await network.start();
    await network.put(new Hid_public_data({name: larosa.name, peer_id: JSON.stringify(larosa.peer_id)}));
    
    const westchester = new Hgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    
    // *** non-API functions -- PUTting menu data not associated with our geolocation...
    const spumoni_gardens = new Hgeo_coord({lat: 40.5947235, long: -73.98131332751743});
    await network.hpht.insert(spumoni_gardens.linearize(), new Hid_public_data({name: "L&B Spumoni Gardens", peer_id: JSON.stringify(new Hbigint(0))}));

    const pinos = new Hgeo_coord({lat: 40.6713257, long: -73.9776937});
    await network.hpht.insert(pinos.linearize(), new Hid_public_data({name: "Pino's La Forchetta", peer_id: new Hbigint(0)}));

    const modern_pizza = new Hgeo_coord({lat: 40.9089094, long: -73.7842226});
    await network.hpht.insert(modern_pizza.linearize(), new Hid_public_data({name: "Modern Pizzeria & Restaurant", peer_id: JSON.stringify(new Hbigint(0))}));
    // ***

    const search_res = await network.geosearch(westchester);
    console.log(search_res);



    // network.hpht._debug_print_stats();
    // network.node._debug_print_routing_table();

    network.hbuy.transact_req({
        order: "debug",
        payment: "debug",
        hid: larosa,
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
