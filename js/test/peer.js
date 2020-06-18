const { Happ } = require("../src/happ/happ.js");
const { Happ_env } = require("../src/happ/happ_env.js");
const { Hgeo_rect } = require("../src/hgeo/hgeo_rect.js");
const { Hgeo_coord } = require("../src/hgeo/hgeo_coord.js");
const { Hbuy } = require("../src/hbuy/hbuy.js");
const { Hbuy_msg } = require("../src/hbuy/hbuy_msg.js");
const { Hbuy_transaction } = require("../src/hbuy/hbuy_transaction.js");
const { Hbuy_status } = require("../src/hbuy/hbuy_status.js");
const { Hlog } = require("../src/hlog/hlog.js");
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


    // network.hpht._debug_print_stats();
    // network.node._debug_print_routing_table();


    // *** PLACE AN ORDER -- THIS SHOULD BE ABSTRACTED AWAY ***
    const transaction = new Hbuy_transaction({
        order: "debug",
        payment: "debug",
        id: Hbigint.random(Hbuy.TRANSACTION_ID_LEN)
    });

    const msg = new Hbuy_msg({
        from: [network.get_node().node_info.addr, network.get_node().node_info.port], // This must be replaced by some global level Hid object!!!
        data: transaction,
        type: Hbuy_msg.TYPE.REQ,
        flavor: Hbuy_msg.FLAVOR.TRANSACT,
        id: Hbigint.random(Hbuy.MSG_ID_LEN)
    });

    // TODO, get addr/port dynamically from node_info
    Hlog.log(`[HBUY] Outbound ${Object.keys(Hbuy_msg.FLAVOR)[msg.flavor]} REQ # ${msg.data.id.toString()} to 66.228.34.29:27500`);

    network.hbuy.send(msg, "66.228.34.29", 27500, (res, ctx) => {
        Hlog.log(`[HBUY] REQ # ${msg.data.id.toString()} ${res.data}`);
        
        network.hbuy.on_status(msg.data.id, Hbuy_status.CODE.CONFIRMED, (req) => {
            console.log(`Received status confirmation for order # ${msg.data.id.toString()}`);
        });
    }, () => {
        console.log("Timed out!");
    });
    /// *** END ORDER *** 
})();
