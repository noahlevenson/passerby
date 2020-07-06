const { Hid } = require("../src/hid/hid.js");
const { Happ } = require("../src/happ/happ.js");
const { Happ_env } = require("../src/happ/happ_env.js");
const { Hgeo_rect } = require("../src/hgeo/hgeo_rect.js");
const { Hgeo_coord } = require("../src/hgeo/hgeo_coord.js");
const { Hbuy_sms } = require("../src/hbuy/hbuy_sms.js");
const { Hbuy_status } = require("../src/hbuy/hbuy_status.js");
const { Hbuy_order } = require("../src/hbuy/hbuy_order.js");
const { Hbuy_payment } = require("../src/hbuy/hbuy_payment.js");
const { Hbuy_item_ref } = require("../src/hbuy/hbuy_item_ref.js");
const { Hlog } = require("../src/hlog/hlog.js");

const { Larosa_menu } = require("./menu.js");

(async function run() {
    const first_name = process.argv[2];
    const last_name = process.argv[3];

    const text = process.argv.slice(4, process.argv.length).join(" ");

    const chat_peer = new Hid({
        public_key: `${first_name} ${last_name}`,
        private_key: `${first_name} ${last_name}`,
        name: `${first_name} ${last_name}`,
        address: "",
        phone: "",
        lat: 0,
        long: 0
    });

    const network = new Happ({hid: chat_peer});
    await network.start();
    
    // A large region of Westchester County encompassing Pizzeria La Rosa
    const westchester = new Hgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    const search_res = await network.geosearch(westchester);
    
    // Assuming search_res[0] is the [key, Hid_public_data] for Pizzeria La Rosa
    const node_info = await network.search_node_info(search_res[0][1].peer_id);

    // Send a chat message to the restaurant
    network.hbuy.sms_req({
       text: text,
       from: network.hid.public_data(),
       addr: node_info.addr,
       port: node_info.port
    });
})();
