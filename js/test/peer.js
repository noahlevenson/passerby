const { Fapp } = require("../src/fapp/fapp.js");
const { Fapp_bboard } = require("../src/fapp/fapp_bboard.js");
const { Fid_pub } = require("../src/fid/fid_pub.js");
const { Fapp_env } = require("../src/fapp/fapp_env.js");
const { Fgeo } = require("../src/fgeo/fgeo.js");
const { Fgeo_rect } = require("../src/fgeo/fgeo_rect.js");
const { Fgeo_coord } = require("../src/fgeo/fgeo_coord.js");
const { Fbuy_status } = require("../src/fbuy/fbuy_status.js");
const { Fbuy_menu } = require("../src/fbuy/fbuy_menu.js");
const { Flog } = require("../src/flog/flog.js");
const { Fbigint } = Fapp_env.BROWSER ? require("../src/ftypes/fbigint/fbigint_browser.js") : require("../src/ftypes/fbigint/fbigint_node.js");
const { Larosa_menu } = require("./menu.js");

(async function run() {
    const larosa = new Fid_pub({
        public_key: "debug_la_rosa_public_key",
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    const network = new Fapp({fid_pub: larosa});
    await network.start();
    // await network.put(new Fapp_bboard({cred: "La Rosa CERT", form: Larosa_menu}));
    
    // const westchester = new Fgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    
    // const search_window = Fgeo.get_exts(network.get_location(), Fapp.SEARCH_DIST_MILES);
    
    // *** non-API functions -- PUTting menu data not associated with our geolocation...
    // const spumoni_gardens = new Fgeo_coord({lat: 40.5947235, long: -73.98131332751743});
    // await network.fpht.insert(spumoni_gardens.linearize(), new Fapp_bboard({cred: "L&B Spumoni CERT", form: null}));

    // const pinos = new Fgeo_coord({lat: 40.6713257, long: -73.9776937});
    // await network.fpht.insert(pinos.linearize(), new Fapp_bboard({cred: "Pino's La Forchetta CERT", form: null}));

    // const modern_pizza = new Fgeo_coord({lat: 40.9089094, long: -73.7842226});
    // await network.fpht.insert(modern_pizza.linearize(), new Fapp_bboard({cred: "Modern Pizza CERT", form: null}));
    
    // const fourbros = new Fgeo_coord({lat: 40.9074648, long: -73.7844935});
    // await network.fpht.insert(fourbros.linearize(), new Fapp_bboard({cred: "4 Bros Pizza CERT", form: null}));


    // const test = new Fgeo_coord({lat: 40, long: 70});
    // console.log(test.linearize())

    // const test2 = new Fgeo_coord({lat: 41, long: 71});
    // console.log(test2.linearize());

    // ***

    // const search_res = await network.geosearch(search_window);
    //console.log(search_res[0][1].form);
    
    // console.log(search_res);


    // const res = await network.get_local_resources();

    // console.log("FINAL FINAL")
    // console.log(res);


    // const rehydrated = new Fbuy_menu(search_res[0][1].form);

    // console.log(rehydrated.get_full_list());


    //network.fpht._debug_print_stats();
    //network.node._debug_print_routing_table();

    // network.fbuy.transact_req({
    //     order: "debug",
    //     payment: "debug",
    //     fid_pub: larosa,
    //     addr: "66.228.34.29",
    //     port: 27500,
    //     success: (res, ctx) => {
    //         network.fbuy.on_status(res.data.id, Fbuy_status.CODE.CONFIRMED, (req) => {
    //             console.log(`Received confirmation for transaction # ${req.data.id.toString()}`);
    //         });
    //     },
    //     timeout: (req) => {
    //         console.log(`Transaction request ${req.data.id.toString()} timed out`);
    //     }
    // });
})();
