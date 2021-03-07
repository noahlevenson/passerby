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
const { Toms_hot_dogs_menu } = require("./toms_hot_dogs_menu.js");
const { Cantina_dinner_menu } = require("./cantina_dinner_menu.js");
const { Alvin_friends_dinner_menu } = require("./alvin_friends_dinner_menu.js");
const { Rocnramen_menu } = require("./rocnramen_menu.js");
const { Hdlt_msg } = require("../src/hdlt/hdlt_msg.js");

(async function run() {
    const larosa = new Hid_pub({
        pubkey: "debug_la_rosa_public_key",
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    const network = new Happ({hid_pub: larosa});
    await network.start();

    network.hksrv.dlt._send(new Hdlt_msg({
        type: Hdlt_msg.TYPE.REQ, 
        flavor: 1,
        app_id: Happ.KEYSERVER_APP_ID,
        id: Hbigint.random(Hdlt_msg.ID_LEN)
    }), "66.228.34.29", 27500);
    
    // await network.put(new Happ_bboard({cred: "La Rosa CERT", form: Larosa_menu.freeze()}));
    
    // const spumoni_gardens = new Hgeo_coord({lat: 40.5947235, long: -73.98131332751743});
    // await network.hpht.insert(spumoni_gardens.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "spum", name: "L&B Spumoni Gardens", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));

    // const pinos = new Hgeo_coord({lat: 40.6713257, long: -73.9776937});
    // await network.hpht.insert(pinos.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "pinos", name: "Pino's La Forchetta", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));

    // const modern_pizza = new Hgeo_coord({lat: 40.9089094, long: -73.7842226});
    // await network.hpht.insert(modern_pizza.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "modern", name: "Modern Pizza and Restaurant", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));
    
    // const ajs_burgers = new Hgeo_coord({lat: 40.9225513, long: -73.7880021});
    // await network.hpht.insert(ajs_burgers.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "ajs", name: "AJ's Burgers", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));

    // const fourbros = new Hgeo_coord({lat: 40.9074648, long: -73.7844935});
    // await network.hpht.insert(fourbros.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "4bros", name: "4 Bros", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));

    // const dubrovnik = new Hgeo_coord({lat: 40.9036258, long: -73.7913645});
    // await network.hpht.insert(dubrovnik.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "dubrovnik", name: "Dubrovnik", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));
    

    // const cantina = new Hgeo_coord({lat: 40.9064583, long: -73.8114695});
    // await network.hpht.insert(cantina.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "cantinalobos", name: "Cantina Lobos", address: "217 Wolf's Lane Pelham NY 10803", phone: "(914) 380-8644"}), form: Cantina_dinner_menu.freeze()}));

    // const toms_hot_dogs = new Hgeo_coord({lat: 40.9072767, long: -73.806507});
    // await network.hpht.insert(toms_hot_dogs.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "toms_hot_dogs", name: "Tom's Hot Dogs", address: "722 Main Street New Rochelle NY 10801", phone: "(914) 777-6677"}), form: Toms_hot_dogs_menu.freeze()}));

    // const alvin = new Hgeo_coord({lat: 40.9088532, long: -73.7848351});
    // await network.hpht.insert(alvin.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "alvinandfriends", name: "Alvin & Friends", address: "14 Memorial Highway New Rochelle NY 10801", phone: "(914) 654-6549"}), form: Alvin_friends_dinner_menu.freeze()}));

    // const rocnramen = new Hgeo_coord({lat: 40.9111487, long: -73.7832296});
    // await network.hpht.insert(rocnramen.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "rocnramen", name: "Roc N Ramen", address: "19 Anderson St. New Rochelle NY 10801", phone: "(914) 365-2267"}), form: Rocnramen_menu.freeze()}));

    // console.log("Done!")
})();
