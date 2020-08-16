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
const { Hbuy_item_misc } = require("../src/hbuy/hbuy_item_misc.js");
const { Hlog } = require("../src/hlog/hlog.js");

const { Larosa_menu } = require("./menu.js");

(async function run() {
    const ottavios_woodworking = new Hid({
        public_key: "debug_public_key_tbd",
        private_key: "debug_private_key_tbd",
        name: "John DeVivo",
        address: "711 Main St. New Rochelle NY 10801",
        phone: "914-235-6887",
        lat: 40.9039873,
        long: -73.7908761
    });

    const network = new Happ({hid: ottavios_woodworking});
    await network.start();
    
    // A large region of Westchester County encompassing Pizzeria La Rosa
    const westchester = new Hgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    const search_res = await network.geosearch(westchester);
    
    // Assuming search_res[0] is the [key, Hid_public_data] for Pizzeria La Rosa
    const node_info = await network.search_node_info(search_res[0][1].peer_id);

    const order = new Hbuy_order({
        type: Hbuy_order.TYPE.DELIVERY
    });

    // Margherita pie with pepperoni + mushrooms
    order.add(new Hbuy_item_ref({
        form_id: Larosa_menu.get_form_id(),
        item_list_idx: 0,
        size_idx: 0,
        cust_cats_idx: [[0, 10]], 
        comment: "extra char"
    }));

    // Family size arugula salad
    order.add(new Hbuy_item_ref({
        form_id: Larosa_menu.get_form_id(),
        item_list_idx: 5,
        size_idx: 1,
        comment: "please no raisins"
    }));

    // Chicken parm with pasta
    order.add(new Hbuy_item_ref({
        form_id: Larosa_menu.get_form_id(),
        item_list_idx: 8,
        size_idx: 0,
        cust_cats_idx: [[0]]
    }));

    // 2x Lemonade
    order.add(new Hbuy_item_ref({
        form_id: Larosa_menu.get_form_id(),
        item_list_idx: 16,
        size_idx: 0,
        qty: 2
    }));

    // Off the menu item
    order.add_misc(new Hbuy_item_misc({
        desc: "Upside down pie",
        price: 15.00
    }));

    const payment = new Hbuy_payment({
        pan: 370434978532007,
        exp_year: 26,
        exp_month: 11,
        cvv: 7021,
        name: "John DeVivo",
        zip: 10801
    });

    network.hbuy.transact_req({
        order: order,
        payment: payment,
        hid: ottavios_woodworking,
        addr: node_info.addr,
        port: node_info.port,
        success: (res, ctx) => {
            network.hbuy.on_status(res.data.id, Hbuy_status.CODE.CONFIRMED, (req) => {
                console.log(`Received confirmation for transaction # ${req.data.id.toString()}`);
            });
        },
        timeout: (req) => {
            console.log(`Transaction request ${req.data.id.toString()} timed out`);
        }
    });

    // Send a chat message to the restaurant
    network.hbuy.sms_req({
       text: "Hi, I'm wondering if you have gluten free pasta? My mother is allergic to gluten. Also, do you have diet Sprite? Or any other diet soda besides diet coke? What is your current delivery time???",
       from: network.hid.public_data(),
       addr: node_info.addr,
       port: node_info.port
    });
})();
