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

(async function run() {
    const larosa = new Hid_pub({
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100de6fe41b07563599c8f54e104c3fd2df32286300f741eb9b2963c90913156b454da7a516623a9d6ffb4991391ba7773502228d0c033c4c59b1ec54faccdce4d4dabf196802b43195481fc7f42c647d81a87cacca414b545bdd8eb7a8d384553e6a5317806452b9f1742d43cb8f5bd3fdad361a86ad90641057be383908eddfc64a916722c851297684a69c93a2210a5077b5cb53613c2aba151f7cccd837a4bf1dcc033abf3b6af51e553648d1a2ca6e90dca0b256ebbaa622375202060a46ef5f035d4f43d36e53b437dea6a96ea6072100dca7b6f1b1af38fbf1d357c147857c82e1d3653fd8ca2fb8809ca4e43f8aface3cb8d6dd1fbf8bed04c71abc21770203010001',
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });
    
    const privkey = '-----BEGIN ENCRYPTED PRIVATE KEY-----\n' +
    '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\n' +
    '-----END ENCRYPTED PRIVATE KEY-----\n'

    const larosa_prv = new Hid_prv({privkey: privkey});

    Hid.find_partial_preimage(larosa, Hid_pub.inc_nonce, 20);

    console.log(larosa.nonce)

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
