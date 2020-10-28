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
    // await network.put(new Happ_bboard({cred: "La Rosa CERT", form: Larosa_menu}));
    
    // const westchester = new Hgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    
    const search_window = Hgeo.get_exts(network.get_location(), Hgeo.SEARCH_DIST_MILES);

    // *** non-API functions -- PUTting menu data not associated with our geolocation...
    const spumoni_gardens = new Hgeo_coord({lat: 40.5947235, long: -73.98131332751743});
    await network.hpht.insert(spumoni_gardens.linearize(), new Happ_bboard({cred: "L&B Spumoni CERT", form: null}));

    const pinos = new Hgeo_coord({lat: 40.6713257, long: -73.9776937});
    await network.hpht.insert(pinos.linearize(), new Happ_bboard({cred: "Pino's La Forchetta CERT", form: null}));

    const modern_pizza = new Hgeo_coord({lat: 40.9089094, long: -73.7842226});
    await network.hpht.insert(modern_pizza.linearize(), new Happ_bboard({cred: "Modern Pizza CERT", form: null}));
    // ***

    const search_res = await network.geosearch(search_window);
    //console.log(search_res[0][1].form);
    
    console.log(search_res);

    const rehydrated = new Hbuy_menu(search_res[0][1].form);

    // console.log(rehydrated.get_full_list());


    network.hpht._debug_print_stats();
    network.node._debug_print_routing_table();

    network.hbuy.transact_req({
        order: "debug",
        payment: "debug",
        hid_pub: larosa,
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
