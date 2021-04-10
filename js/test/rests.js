const { Fapp } = require("../src/fapp/fapp.js");
const { Fapp_bboard } = require("../src/fapp/fapp_bboard.js");
const { Fid } = require("../src/fid/fid.js");
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
const { Toms_hot_dogs_menu } = require("./toms_hot_dogs_menu.js");
const { Cantina_dinner_menu } = require("./cantina_dinner_menu.js");
const { Alvin_friends_dinner_menu } = require("./alvin_friends_dinner_menu.js");
const { Rocnramen_menu } = require("./rocnramen_menu.js");
const { Fdlt } = require("../src/fdlt/fdlt.js");
const { Fdlt_msg } = require("../src/fdlt/fdlt_msg.js")
const { Fdlt_tsact } = require("../src/fdlt/fdlt_tsact.js");
const { Fdlt_block } = require("../src/fdlt/fdlt_block.js");

(async function run() {
    const larosa = new Fid_pub({
        pubkey: "3056301006072a8648ce3d020106052b8104000a034200044a8338487fd885fe91435de1b5f78bb14a4bbedd38caa467ec86715e4073d8cba6f02b6d63e2cd9981fc560579d96adbe6edd832b1d0bd0c73841704234cee9f",
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    const privkey = '-----BEGIN ENCRYPTED PRIVATE KEY-----\n' +
    'MIHsMFcGCSqGSIb3DQEFDTBKMCkGCSqGSIb3DQEFDDAcBAiLhWWYGo9tOAICCAAw\n' +
    'DAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEEKcoNHdis4NY6VWiJPgOTZsEgZC2\n' +
    'f4udLVPbh+LhFq0FhnxDtLhEpTK1ZmiIGgtmT4oEo7s/ODDtUmYe2VGaenD2UiG+\n' +
    'KqunI/83BdppRBh9lvqp46upAp19vqeDhxktp6x2GHtru8r86SYUbh72oQMBm3TA\n' +
    'tYXJIRLxrOt8EwZciAy1S31dPnIyFvXX7sPQsIF0wCfQ+40FReKzwJJ2bvkLmDA=\n' +
    '-----END ENCRYPTED PRIVATE KEY-----\n'

    Fid.find_partial_preimage(larosa, Fid_pub.inc_nonce, 20);

    // Lil hack to make us one of the AUTH nodes
    Fapp.AUTHORITIES = [larosa.pubkey];

    Fid.set_passphrase_func(() => {
        return new Promise((resolve, reject) => {
            resolve("mypassword");
        });
    });

    const network = new Fapp({fid_pub: larosa});
    await network.start();

    const last_known_block = network.fksrv.dlt.store.tree.get_root().data;

    const tx_new = network.fksrv.sign(larosa, larosa);

    network.fksrv.dlt.tx_cache.set(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx_new)));

    // network.fksrv.dlt.broadcast(
    //     network.fksrv.dlt.tx_req,
    //     {fdlt_tsact: tx_new}
    // );

    const block = new Fdlt_block({
        prev_block: network.fksrv.dlt.store.tree.get_root().data,
        tsacts: [tx_new]
    });

    block.nonce = await Fdlt.make_nonce_auth(block, larosa.pubkey, privkey);
    
    network.fksrv.dlt.broadcast(
        network.fksrv.dlt.block_req,
        {fdlt_block: block}
    );
    
    // *** here comes the next block:

    const new_block = new Fdlt_block({
        prev_block: block,
        tsacts: [tx_new]
    });

    new_block.nonce = await Fdlt.make_nonce_auth(new_block, larosa.pubkey, privkey);

    network.fksrv.dlt.broadcast(
        network.fksrv.dlt.block_req,
        {fdlt_block: new_block}
    );
    

    // console.log(network.fksrv.dlt.store.get_deepest_blocks());

    // await network.put(new Fapp_bboard({cred: "La Rosa CERT", form: Larosa_menu.freeze()}));
    
    // const spumoni_gardens = new Fgeo_coord({lat: 40.5947235, long: -73.98131332751743});
    // await network.fpht.insert(spumoni_gardens.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "spum", name: "L&B Spumoni Gardens", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));

    // const pinos = new Fgeo_coord({lat: 40.6713257, long: -73.9776937});
    // await network.fpht.insert(pinos.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "pinos", name: "Pino's La Forchetta", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));

    // const modern_pizza = new Fgeo_coord({lat: 40.9089094, long: -73.7842226});
    // await network.fpht.insert(modern_pizza.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "modern", name: "Modern Pizza and Restaurant", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));
    
    // const ajs_burgers = new Fgeo_coord({lat: 40.9225513, long: -73.7880021});
    // await network.fpht.insert(ajs_burgers.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "ajs", name: "AJ's Burgers", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));

    // const fourbros = new Fgeo_coord({lat: 40.9074648, long: -73.7844935});
    // await network.fpht.insert(fourbros.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "4bros", name: "4 Bros", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));

    // const dubrovnik = new Fgeo_coord({lat: 40.9036258, long: -73.7913645});
    // await network.fpht.insert(dubrovnik.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "dubrovnik", name: "Dubrovnik", address: "unknown address", phone: "unknown phone"}), form: Toms_hot_dogs_menu.freeze()}));
    

    // const cantina = new Fgeo_coord({lat: 40.9064583, long: -73.8114695});
    // await network.fpht.insert(cantina.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "cantinalobos", name: "Cantina Lobos", address: "217 Wolf's Lane Pelham NY 10803", phone: "(914) 380-8644"}), form: Cantina_dinner_menu.freeze()}));

    // const toms_hot_dogs = new Fgeo_coord({lat: 40.9072767, long: -73.806507});
    // await network.fpht.insert(toms_hot_dogs.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "toms_hot_dogs", name: "Tom's Hot Dogs", address: "722 Main Street New Rochelle NY 10801", phone: "(914) 777-6677"}), form: Toms_hot_dogs_menu.freeze()}));

    // const alvin = new Fgeo_coord({lat: 40.9088532, long: -73.7848351});
    // await network.fpht.insert(alvin.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "alvinandfriends", name: "Alvin & Friends", address: "14 Memorial Highway New Rochelle NY 10801", phone: "(914) 654-6549"}), form: Alvin_friends_dinner_menu.freeze()}));

    // const rocnramen = new Fgeo_coord({lat: 40.9111487, long: -73.7832296});
    // await network.fpht.insert(rocnramen.linearize(), new Fapp_bboard({cred: new Fid_pub({pubkey: "rocnramen", name: "Roc N Ramen", address: "19 Anderson St. New Rochelle NY 10801", phone: "(914) 365-2267"}), form: Rocnramen_menu.freeze()}));

    // console.log("Done!")
})();
