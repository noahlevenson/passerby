const { Fapp } = require("../libfood/js/src/fapp/fapp.js");
const { Fapp_bboard } = require("../libfood/js/src/fapp/fapp_bboard.js");
const { Fid_pub } = require("../libfood/js/src/fid/fid_pub.js");
const { Fgeo_coord } = require("../libfood/js/src/fgeo/fgeo_coord.js");
const { Cantina_dinner_menu } = require("../libfood/js/test/cantina_dinner_menu.js");
const { Toms_hot_dogs_menu } = require("../libfood/js/test/toms_hot_dogs_menu.js");
const { Alvin_friends_dinner_menu } = require("../libfood/js/test/alvin_friends_dinner_menu.js");
const { Rocnramen_menu } = require("../libfood/js/test/rocnramen_menu.js");

(async function run() {
    const newark_bootstrap_node = new Fid_pub({
        pubkey: "bootstrap_node_newark_public_key_tbd",
        name: "bs3.actual.is",
        address: "",
        phone: "",
        lat: 0,
        long: 0
    }); 

    const network = new Fapp({fid_pub: newark_bootstrap_node});
    await network.start({addr: "66.228.34.29", port: 27500});
    
    // *** TEMP FOR NOVEMBER DEMO -- POPULATE THE NETWORK WITH SOME SIMULATED RESTAURANTS
    const cantina = new Fgeo_coord({lat: 40.9064583, long: -73.8114695});
    await network.fpht.insert(cantina.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "cantinalobos", name: "Cantina Lobos", address: "217 Wolf's Lane Pelham NY 10803", phone: "(914) 380-8644"}), form: Cantina_dinner_menu.freeze()}));

    const toms_hot_dogs = new Fgeo_coord({lat: 40.9072767, long: -73.806507});
    await network.fpht.insert(toms_hot_dogs.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "toms_hot_dogs", name: "Tom's Hot Dogs", address: "722 Main Street New Rochelle NY 10801", phone: "(914) 777-6677"}), form: Toms_hot_dogs_menu.freeze()}));

    const alvin = new Fgeo_coord({lat: 40.9088532, long: -73.7848351});
    await network.fpht.insert(alvin.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "alvinandfriends", name: "Alvin & Friends", address: "14 Memorial Highway New Rochelle NY 10801", phone: "(914) 654-6549"}), form: Alvin_friends_dinner_menu.freeze()}));

    const rocnramen = new Fgeo_coord({lat: 40.9111487, long: -73.7832296});
    await network.fpht.insert(rocnramen.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "rocnramen", name: "Roc N Ramen", address: "19 Anderson St. New Rochelle NY 10801", phone: "(914) 365-2267"}), form: Rocnramen_menu.freeze()}));

    console.log("Done!")
})();
