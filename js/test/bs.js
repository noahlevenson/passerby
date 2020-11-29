const { Happ } = require("../heaven/js/src/happ/happ.js");
const { Happ_bboard } = require("../heaven/js/src/happ/happ_bboard.js");
const { Hid_pub } = require("../heaven/js/src/hid/hid_pub.js");
const { Hgeo_coord } = require("../heaven/js/src/hgeo/hgeo_coord.js");

(async function run() {
    const newark_bootstrap_node = new Hid_pub({
        pubkey: "bootstrap_node_newark_public_key_tbd",
        name: "bs3.actual.is",
        address: "",
        phone: "",
        lat: 0,
        long: 0
    }); 

    const network = new Happ({hid_pub: newark_bootstrap_node});
    await network.start({addr: "66.228.34.29", port: 27500});
    
    // *** TEMP FOR NOVEMBER DEMO -- POPULATE THE NETWORK WITH SOME SIMULATED RESTAURANTS
    const cantina = new Hgeo_coord({lat: 40.9064583, long: -73.8114695});
    await network.hpht.insert(cantina.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "cantinalobos", name: "Cantina Lobos", address: "217 Wolf's Lane Pelham NY 10803", phone: "(914) 380-8644"}), form: Cantina_dinner_menu.freeze()}));

    const toms_hot_dogs = new Hgeo_coord({lat: 40.9072767, long: -73.806507});
    await network.hpht.insert(toms_hot_dogs.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "toms_hot_dogs", name: "Tom's Hot Dogs", address: "722 Main Street New Rochelle NY 10801", phone: "(914) 777-6677"}), form: Toms_hot_dogs_menu.freeze()}));

    const alvin = new Hgeo_coord({lat: 40.9088532, long: -73.7848351});
    await network.hpht.insert(alvin.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "alvinandfriends", name: "Alvin & Friends", address: "14 Memorial Highway New Rochelle NY 10801", phone: "(914) 654-6549"}), form: Alvin_friends_dinner_menu.freeze()}));

    const rocnramen = new Hgeo_coord({lat: 40.9111487, long: -73.7832296});
    await network.hpht.insert(rocnramen.linearize(), new Happ_bboard({cred: new Hid_pub({pubkey: "rocnramen", name: "Roc N Ramen", address: "19 Anderson St. New Rochelle NY 10801", phone: "(914) 365-2267"}), form: Rocnramen_menu.freeze()}));

    console.log("Done!")
})();
