const { Happ } = require("../src/happ/happ.js");
const { Happ_bboard } = require("../src/happ/happ_bboard.js");
const { Hid } = require("../src/hid/hid.js");
const { Hid_pub } = require("../src/hid/hid_pub.js");
const { Hid_prv } = require("../src/hid/hid_prv.js");
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

const crypto = require("crypto");

(async function run() {
    const larosa = new Hid_pub({
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100a18ed1840adbc2c12dcc6e47dd03e7155cc93fe08f2134fc3694d174ad7e9803d98ba97ecbe2a1fb84ca6138d15fe53ccbf1963a7de52edf08c221a160c54894c0ce6294480ec5184feb8599eb3306b35321f0ce0174b157de870a3baa969a650d392d3a597a9d64ae56069a8b93ac88048f6bbe48e70966c967c9750a2630c60fe974907e50fcb445de48bc7c71b471dcd0efd6cf2594fea1589f61f4415ef2a7dba94177114c8247af18af7c9c9a536b0e04fc896c7d5ffd32b142ec4408deeba3670a17bec455d878d0e171d4ca74e2b72edb518f1f176490e01e2de96f50349cf95a6c50cda8663e64057dda5b2d16158e843951ff798174f13c4667aaed0203010001',
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    const privkey = '-----BEGIN ENCRYPTED PRIVATE KEY-----\n' +
    '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\n' +
    '-----END ENCRYPTED PRIVATE KEY-----\n';

    const larosa_prv = new Hid_prv({privkey: privkey});

    Hid.find_partial_preimage(larosa, Hid_pub.inc_nonce, 20);

    // Lil hack to make us one of the AUTH nodes
    // Happ.AUTHORITIES = [larosa.pubkey];

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

    // Sign the bootstrap node, add it to our tx_cache, and broadcast it
    const bs_bro = new Hid_pub({
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100c37ed4eced3c19d6e3b740dcd59e0a0ef5e361cfc6923fc9def3864a94c4b1d877865e06152ec61e7af3bff96c79139b795cb8b81b9474b676d9ac97d5449ea7df42ef8f827aca3243ca836bd8a9c69120be6708b354e449c647ecb6a9c28f0f4dfa70a38de17d4b2af31cd7871645248a34269a412e6588134cf652d30e1fbf51275f9a1ca01395ad53b73d5f3456a21bb5d05fa53813cef6195e575ab8fdfa6ceab8a498e5ace6660199065eb75f636c23297a0146ac626788eabc66111d9b9198febc1d2c9480630837377a9ec4249c9423f573d0a01ae59691f8c594c843c244e85e9d31591b793e8de8897bbbd02549bff6402ec8779a0284be895949ed0203010001'
    });

    const tx_new_2 = network.hksrv.sign(larosa, bs_bro);
    network.hksrv.dlt.tx_cache.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new_2)));
    network.hksrv.dlt.broadcast(network.hksrv.dlt.tx_req, {hdlt_tsact: tx_new_2}); 

    // Wait 30 seconds and revoke my signature from the bootstrap node
    setTimeout(async () => {
        const tx_new_3 = await network.hksrv.revoke(larosa, larosa_prv, bs_bro);
        network.hksrv.dlt.tx_cache.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new_3)));
        network.hksrv.dlt.broadcast(network.hksrv.dlt.tx_req, {hdlt_tsact: tx_new_3}); 
    }, 30000); 
})();
