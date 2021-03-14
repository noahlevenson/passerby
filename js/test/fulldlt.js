const { Happ } = require("../src/happ/happ.js");
const { Happ_bboard } = require("../src/happ/happ_bboard.js");
const { Hid } = require("../src/hid/hid.js");
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
const { Hdlt } = require("../src/hdlt/hdlt.js");
const { Hdlt_msg } = require("../src/hdlt/hdlt_msg.js")
const { Hdlt_tsact } = require("../src/hdlt/hdlt_tsact.js");
const { Hdlt_block } = require("../src/hdlt/hdlt_block.js");

(async function run() {
    const larosa = new Hid_pub({
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

    Hid.find_partial_preimage(larosa, Hid_pub.inc_nonce, 20);

    // Lil hack to make us one of the AUTH nodes
    Happ.AUTHORITIES = [larosa.pubkey];

    Hid.set_passphrase_func(() => {
        return new Promise((resolve, reject) => {
            resolve("mypassword");
        });
    });

    const network = new Happ({hid_pub: larosa});
    await network.start();

    // Make a self-signature transaction, add it to our tx_cache, and broadcast it
    const tx_new = network.hksrv.sign(larosa, larosa);
    network.hksrv.dlt.tx_cache.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new)));
    network.hksrv.dlt.broadcast(network.hksrv.dlt.tx_req, {hdlt_tsact: tx_new});   
})();
