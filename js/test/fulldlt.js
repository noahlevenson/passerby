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
        pubkey: '-----BEGIN PUBLIC KEY-----\n' +
            'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1rrZeYggXfaJqYdiixFC\n' +
            'WS2MdVaJR0AVJghP5KD2eFV0Nd1SNbGAebiYeG9MXZcXNU8r9BvROAl208hAEOLs\n' +
            'C/NZOtMFkQ/HYaK5mLcRem3+pLntZpKKiXMtF2FKUsCNIf4z7zkftZeQy02C7cmo\n' +
            '1lE4aZ2sekfaFvA++haddHLcdlNZGPNx8uvVHyK/F2YjOwiH6ca8vPunydUomXad\n' +
            'fp5buXakN0lZxkiu2RACSGPczB6u93ZxbE12rdpC/SirBqAjVzqVNrefcMBVC5nO\n' +
            '4X93LtMyehZLcuO98z5V5VQYRZcZwocZCfObLu+P9/pPTPGRKF7cLbWT8f4UjnXf\n' +
            'vQIDAQAB\n' +
            '-----END PUBLIC KEY-----\n',
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
