const { Fid_pub } = require("../src/fid/fid_pub.js");
const { Fapp } = require("../src/fapp/fapp.js");
const { Fapp_env } = require("../src/fapp/fapp_env.js");
const { Fgeo } = require("../src/fgeo/fgeo.js");
const { Fgeo_rect } = require("../src/fgeo/fgeo_rect.js");
const { Fgeo_coord } = require("../src/fgeo/fgeo_coord.js");
const { Fbuy_sms } = require("../src/fbuy/fbuy_sms.js");
const { Fbuy_status } = require("../src/fbuy/fbuy_status.js");
const { Fbuy_order } = require("../src/fbuy/fbuy_order.js");
const { Fbuy_menu } = require("../src/fbuy/fbuy_menu.js");
const { Fbuy_payment } = require("../src/fbuy/fbuy_payment.js");
const { Fbuy_item_ref } = require("../src/fbuy/fbuy_item_ref.js");
const { Fbuy_item_misc } = require("../src/fbuy/fbuy_item_misc.js");
const { Flog } = require("../src/flog/flog.js");

const { Larosa_menu } = require("./menu.js");

(async function run() {
    const ottavios_woodworking = new Fid_pub({
        public_key: "debug_public_key_tbd",
        name: "John DeVivo",
        address: "711 Main St. New Rochelle NY 10801",
        phone: "914-235-6887",
        lat: 40.9039873,
        long: -73.7908761
    });
    
    console.log(Larosa_menu.get_node_list());

    const network = new Fapp({fid_pub: ottavios_woodworking});
    await network.start();
    
    // A large region of Westchester County encompassing Pizzeria La Rosa
    const westchester = new Fgeo_rect({bottom: 40.86956, left: -73.86881, top: 40.93391, right: -73.70985});
    
    // console.log(search_window);

    const search_res = await network.get_local_resources();
    
    console.log(search_res[0]);

    // Assuming search_res[0] is the [key, Fapp_bboard] for Pizzeria La Rosa
    const node_info = await network.search_node_info(Fapp.get_peer_id(search_res[0][1].cred));

    const order = new Fbuy_order({
        type: Fbuy_order.TYPE.DELIVERY
    });
    
    
    // Margherita pie with pepperoni + mushrooms
    order.add(new Fbuy_item_ref({
        form_id: Fbuy_menu.get_form_id(Larosa_menu),
        froz_idx: 2,
        size_idx: 0,
        cust_cats_idx: [[0, 10]], 
        comment: "extra char"
    }));

    // Family size arugula salad
    order.add(new Fbuy_item_ref({
        form_id: Fbuy_menu.get_form_id(Larosa_menu),
        froz_idx: 8,
        size_idx: 1,
        comment: "please no raisins"
    }));

    // Chicken parm with pasta
    order.add(new Fbuy_item_ref({
        form_id: Fbuy_menu.get_form_id(Larosa_menu),
        froz_idx: 12,
        size_idx: 0,
        cust_cats_idx: [[0]]
    }));

    // 2x Lemonade
    order.add(new Fbuy_item_ref({
        form_id: Fbuy_menu.get_form_id(Larosa_menu),
        froz_idx: 21,
        size_idx: 0,
        qty: 2
    }));

    // Off the menu item
    order.add_misc(new Fbuy_item_misc({
        desc: "Upside down pie",
        price: 15.00
    }));

    const payment = new Fbuy_payment({
        pan: 370434978532007,
        exp_year: 26,
        exp_month: 11,
        cvv: 7021,
        name: "John DeVivo",
        zip: 10801
    });

    network.fbuy.transact_req({
        order: order,
        payment: payment,
        fid_pub: ottavios_woodworking,
        addr: node_info.addr,
        port: node_info.port,
        success: (res, ctx) => {
            network.fbuy.on_status(res.data.id, Fbuy_status.CODE.CONFIRMED, (req) => {
                console.log(`Received confirmation for transaction # ${req.data.id.toString()}`);
            });
        },
        timeout: (req) => {
            console.log(`Transaction request ${req.data.id.toString()} timed out`);
        }
    });

    // Send a chat message to the restaurant
    network.fbuy.sms_req({
       text: "Hi, I'm wondering if you have gluten free pasta? My mother is allergic to gluten. Also, do you have diet Sprite? Or any other diet soda besides diet coke? What is your current delivery time???",
       from: network.fid_pub,
       addr: node_info.addr,
       port: node_info.port
    });
})();
