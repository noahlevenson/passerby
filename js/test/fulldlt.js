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
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100cdbb9e2e8f5c82f11c19af04f8313bbbc15e2a637a41f6fdcef3bf4496c45efbc1344efa9fecbd223b7e76348cdedc2479445215d0b9d12ff20afbc8ed2bf214bd66ad9c1ec89fb6b847e5b83495af9ae84c951f573ad4acd8765cfd2876262cd42793fccc8f5634510e6c884b9e431bece455631d7121a280ecba2ac3fcd8a0bd634f68d9997f8ac560fc5248c4a2996455210b461077bb3e8b1fe1cc497bcd73a5865cef1f6090cf8c19f6397a4c1136ad6d82793bcdf551cf5666b0c358da4c81c91c3b0441fcc92dbd4dc8d20a846657c20c993f862d70cbc5d1e26a88af865a31a48dc1ee2f7e12581f78c9fc44560d1c278cdc80633a4808d6d2398d210203010001',
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    //console.log(Hid.generate_key_pair("yeahbro"));

    const privkey = '-----BEGIN RSA PRIVATE KEY-----\n' +
    'Proc-Type: 4,ENCRYPTED\n' +
    'DEK-Info: AES-256-CBC,D407068552C99578279EEE96E15DEF55\n' +
    '\n' +
    '7r8hIShR+RvH0Lv2Wp4LstkE9TRLhT5m+X+/X1SyLEs+7UT9koC0JJrbkGawh8YI\n' +
    '7X4sFrf/rvedtdzlcyh4yfZ/G8/7sqCCU1GV5prKGBTgpsurEuh2zg1dOH/57rgJ\n' +
    'ERscNXoNIBVkuRq8n+ntl9iOhhmCn55r5EyzWbget4YzW9YelRAzwQERvjvw95Ov\n' +
    '0MPQ5lUTuJ1gaEMftqiCqatw9jZmBGXiJw2crIYHDpNLgv9nEqKP3zsrsrJjlL6G\n' +
    'mRHggYN0A9mPAljQ8aZt86F+4lGDOqMMxE/NeJihr8tWs1xzfJ/DIRYaoa8V7BUB\n' +
    'MLLMiXyTksraSNj/06qoFktR2SSQHGCrMMaY1xLo3vnErWsJnQHZTKPYux9qWLjF\n' +
    'wyjHx7VHbCtdCki7J/w5UMchi4PyD7JKeWAesSIDiGY6QQHlB2gKK9C8uePURVOx\n' +
    'kTxvjUmvpNFscEuXNw1+52a8YUg8mvvywHk+EF/E4dTvz59XPKr0hqlolqDxPCO4\n' +
    'OJxhZt5tlfpD3DUNM5KIHes6gEYH9SIJpQKJJiVZ0IxN2BUZmCs2nNqPBpvrl/dk\n' +
    '9VoUxY4bn6ULPl2SgVH3EYBJdgHA9f9YvAunQV6ccfKD271yifzBrW5ZLhwUTDho\n' +
    'NeBvEvqq/wCexwUVjT2WcQedkY0wzAqxiJVDSaBvcBWTyyy+iun5iD9fGDXVdycJ\n' +
    'X6WuPdPovCgDDja9B5KvJ6jVoVm6+KYl/B63ySqlbbqVuLa7rV/qVVpr9E1gfz91\n' +
    'agwfUE5cCMmLLcEHcKE7fgCOXy573taw9Iz+mywlk/ftua0T/a0AGEBwRNmrvdQS\n' +
    'BHzyHs2fH/uyeJGbtQLauGGCMkLyR9xZvr5MGGmZ+hghaJETp4k/OdWLtJCTLYlE\n' +
    'HipnKQzIR0iPOj+gWWsa4a+gUcILoBX7N1XsBmEWlYHMz1UB4RmczIP8pat21FCa\n' +
    'mGd9ZP7kjokbVoac78Qie29IDyrsl/F1XHoEzWJDgutqKzwTY20pW565w5/x702N\n' +
    'aE7HAIxRF0Yo3+6D5GnvXHfgda3Sr4sy6ihF1+ARCYce97/kleFg7b8Orv5C1SBA\n' +
    'TlAUTog6oL5e8vgGoZ3NIbXGKOk2Q2sr3pnuGJk4dkR/32n1Hwd5HoOmsWB2Y13m\n' +
    '1zSnDCPwh0fQyHoD3r7on9Db6fT90r7UYz8zEibvrhytqInIFyAtlcT/qzq0Elzr\n' +
    'In5mQHLSoT8iLOuVFysPxlWlo7/mc65CFTh14TdNBsjnJ4cF/9nZzXG3CJotsKLC\n' +
    'BxDFJh7a5Aloz8P0Pbe0mGaaQGat3TjzwirG/yZxh3QPcDHOltLGszK5QCp0OJQS\n' +
    'LTZaIJ00KcW2KJTrop6I4HvKiQwberOwyDgSZmHETAUcGKSDVoamP7zBnyudw/wF\n' +
    'WLA1NIfIfeyfMvK9kIXC0T19IrW6aiKC/hrRcCv/HVLz+BAX4ymiPKonKKoEG19I\n' +
    'w994mPvadd/Ci89EOv+BeoQu01PlR/pQGTOBHgqNsWiBBT6z9BWlF4/cJHzSLYAI\n' +
    'UqGa2c+/DP79CkmtNJNngS4NoHsBVSzoghhJNFHObNuhS8qJtz68BLqLE9KaEuqi\n' +
    '-----END RSA PRIVATE KEY-----\n'
;

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
    const tx_new = await network.hksrv.sign(larosa, larosa_prv, larosa);
    network.hksrv.dlt.tx_cache.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new)));
    network.hksrv.dlt.broadcast(network.hksrv.dlt.tx_req, {hdlt_tsact: tx_new});   

    // Sign the bootstrap node, add it to our tx_cache, and broadcast it
    const bs_bro = new Hid_pub({
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100caba866e6b543fe0dadf671425b00717734d6fbf8af19b981f37a8d8449297597eaebfdfe6f4c6bfb2d1b2dcbf85003120fbc2d76159847cee87e39318aa81f2dd828bdd373acab37f713f1087a31145833795906c4b619fe1f99e902938e3056710efe0ee6dedb296a7a2e392d912357630c68a00cea19f808cc27810e027a85c14ae97a171f3bde538e7625591f4c9f825d48ef980070431fe0e001acbbdd451aaab19d9af51783c2a30cde74ea30b4ce0c7d07771aa865d687a167a3ca837cb6348abf13345f20f98ac26bb1cb03c3d4916cca3c61d646052157705cbc3b563b35ea1bbfa2e017343263d5e8f7855190c775f60c8060a3cbd78302f043e550203010001'
    });

    const tx_new_2 = await network.hksrv.sign(larosa, larosa_prv, bs_bro);
    network.hksrv.dlt.tx_cache.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new_2)));
    network.hksrv.dlt.broadcast(network.hksrv.dlt.tx_req, {hdlt_tsact: tx_new_2}); 

    // Wait 30 seconds and revoke my signature from the bootstrap node
    setTimeout(async () => {
        const tx_new_3 = await network.hksrv.revoke(larosa, larosa_prv, bs_bro);
        network.hksrv.dlt.tx_cache.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new_3)));
        network.hksrv.dlt.broadcast(network.hksrv.dlt.tx_req, {hdlt_tsact: tx_new_3}); 
    }, 30000); 
})();
