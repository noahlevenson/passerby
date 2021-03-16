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
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100a7cdcd4051c561bc73b83b5078ef60d3a2482b10ef401658e89ea1dca533c53e5ea4ab5d803b9db771a4b56aaa245f733c368e4096d6e7b4eedf844acd1d9dd302d76e8da604ae2c6c9fe6f8078708170f90fb560d6f0b21c5e0d9442365c9830e23e04c464247d68d00c129e02ffdbe525dd86a59f43c8e4434527bc8b95683b4f9f0992c604604a91c5df808a76aae4a2b4ed29bf62204df7cba754dd4cc841e91816e2363a130a75b58c18c4274508c749b39c9b06d31cf13055b34d5f6164344d0f6ff1afdcc7d75e5f112af023c0c0b7a44b5ae6bfe245d032aba807db712fdec1f02da3167d4489f1af2604de3a995eea0098f0e8e00754b36e4e0465d0203010001',
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    console.log(Hid.generate_key_pair("yeahbro"));

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
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100c9930f21dcecc26d53562cfcbe27a9726bb3bfa4d60308f17f37bfac54dc9afe5065661f1abb4056c73d563393048e764487e5522c2ea1da4eeea50df49eaaf61a14c996f3ad526160ab85c60254b2b4a8c670cece21658ad866b5a0bf5d078c0badbb986271b5ce767ccf22d3f9200efde2136233107d6aca7d0724d0de64d745a8eb9566a9c0c9033937bc6d1c9a8137524c491dc30b708a74b8c1e11154f246702285f8ab9a618233b86ba75a870305e44484919ef8c060c2a0041b1de011663b00341a80a0aa15ad228e973918d4850b51b7d12ecfa743d22056fa09d54da3e387f7e3f787296e4404aeb089ab3be9c0c80096c6176ffacb23d1a04f86b10203010001'
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
