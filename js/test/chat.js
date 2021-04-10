const { Fid_pub } = require("../src/fid/fid_pub.js");
const { Fapp } = require("../src/fapp/fapp.js");
const { Fapp_env } = require("../src/fapp/fapp_env.js");
const { Fgeo_rect } = require("../src/fgeo/fgeo_rect.js");
const { Fgeo_coord } = require("../src/fgeo/fgeo_coord.js");
const { Fbuy_sms } = require("../src/fbuy/fbuy_sms.js");
const { Fbuy_status } = require("../src/fbuy/fbuy_status.js");
const { Fbuy_order } = require("../src/fbuy/fbuy_order.js");
const { Fbuy_item_ref } = require("../src/fbuy/fbuy_item_ref.js");
const { Flog } = require("../src/flog/flog.js");

const { Larosa_menu } = require("./menu.js");

(async function run() {
    const first_name = process.argv[2];
    const last_name = process.argv[3];

    const text = process.argv.slice(4, process.argv.length).join(" ");

    const chat_peer = new Fid_pub({
        pubkey: `${first_name} ${last_name}`,
        name: `${first_name} ${last_name}`,
        first: first_name,
        last: last_name,
        address: "",
        phone: "",
        lat: 0,
        long: 0
    });

    const network = new Fapp({fid_pub: chat_peer, port: 28500});
    await network.start({port: 28500});
    
    // A large region of Westchester County encompassing Pizzeria La Rosa
    const westchester = new Fgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    const search_res = await network.geosearch(westchester);
    
    // Assuming search_res[0] is the [key, Fapp_bboard] for Pizzeria La Rosa
    // const node_info = await network.search_node_info();

    // Send a chat message to the restaurant
    network.send_sms({
        pubkey: "debug_pizzeria_la_rosa_public_key",
        text: text,
        from: network.fid_pub
    });
})();
