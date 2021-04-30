const { Fapp } = require("../src/fapp/fapp.js");
const { Fapp_bboard } = require("../src/fapp/fapp_bboard.js");
const { Futil } = require("../src/futil/futil.js");
const { Fcrypto } = require("../src/fcrypto/fcrypto.js");
const { Fid } = require("../src/fid/fid.js");
const { Fid_pub } = require("../src/fid/fid_pub.js");
const { Fid_prv } = require("../src/fid/fid_prv.js");
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
    // const key = await Fcrypto.generate_one_time_key();
    // const iv = await Fcrypto.generate_one_time_iv();

    // const encrypted = await Fcrypto.symmetric_encrypt(Buffer.from([3, 1, 3, 3, 7]), key, iv);

    // console.log(encrypted);

    // console.log(await Fcrypto.symmetric_decrypt(encrypted, key, iv));


    const larosa = new Fid_pub({
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100a6108c362961ff79246467b1b0c8505aac91fde23daa711e297f4601b053acb18c2e90defbaba60bdfee93fbab3c1d0d0559a50dfb5d0356bee484814a786f7b9e679e6ed822ff77bfc2c4fcc232e418aa5ebddcbbaa27d63939108a3bd91694c0f347fc1038d151306eecd0630719809aa4187c0d1dab1bb132ff0df29cbd5342ed32d51d1db053ecb6eacc7c998a19d3f46534d0d9b70d706ef8f90d75431a8a192f772170b7c97e1f97e651d7ec5ca00a8bf2f5a896e232750f0ecf9007bfdd51550c6a0da554c79a64dc4164c71885682d75e278c0fc27db1942b4d15d48c9ff9c2aa8f1e9b77d211a4ae8aa56927cf9393dc71121d97eadb52c555bba310203010001',
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    // const pw_hash = Fcrypto.sha256("noah");
    // console.log(pw_hash);
    // console.log(Fcrypto.generate_key_pair(pw_hash));

    const privkey = '3082052d305706092a864886f70d01050d304a302906092a864886f70d01050c301c040884d9eab23a74800802020800300c06082a864886f70d02090500301d060960864801650304012a0410df97d2c39a2552cd1a3aefaa6731ab60048204d01847c4c819fc426a99109d10138a460798de6dfd9ff4c5d2098bb57f9adc264ef7bc095a1c5d16aa2e4f03ceb2f540d4a3c5e51c45b81d3f72a2cb9cb84c00deace3bbb77a414a9ec96fe8ca63cdef3726e6de75be13970363d689eae59ecc0188d49b669f8a74bd2209aaa9aa4f6b1628f3b15a9a8d8fb6c6caab40e79ebcc3f57eb83d1c6fd420eb1fb3b0ca9715d6842f510372898921249a224a77413e9928083fe89cd5fb33352ef2e95a09d80ceb892b1e47240f6275d4a190f0e8bc009f38b2c0402d3b2579495f259f99e13e44013472d41cdd92b28cef42a2e5e88bc33e3b7314e2bbb5f853ef52333a378872812567bfc6824ba6c450c48b74872fc70f6e346aecc87d57fda993dcd4ff2b18687dd365a7f26621024e77ecd549f16f5f29759edbc1f8fc45a109b23925f1687c1597165bac2d6486d973b3fa3b5f1e81e5d46f43a22e28bb7546dbc270ea1f65eac9a6cfc3de87803db5358926382da95123687c5a9b925a60c34ae556db741b204ac46df98bdec27306d29ab52d45a566d97d4a1684d07d14fc21ef3fa3eaa9d88749fe4966aab26817e99f82992f27b46c3bcd7ff727e6477599dee59118bd53582c32c9efda62951cd0bae7f1bc8b4947d21b1bf304ebd81e4a4aa2120b2736e97603f99ae596b5d7e8f4ae7aea30c49aef29f575bec2c4c59048d2fde83d60973d18a69d39a710304d38a896d2e60023df3af9472145307e2b55161bde3a0281d24e24df98edb4c3fc796751785a371d149099597e40f38a8b2c89441eeaac484aaf1c2ec42f3237637f138fbdc6f3c56a2aeb8d482aca7722c2f470b49cc17975c3dad72c644b22fcc164d11ae0c4075c83b605b88994fc56ce2645266966a3f5239c30c5cba8823aa325a001eab7a7d513edcf1d10efb132c2cd4e93a99bd9aed64ead6dcbb440b9dbbd5294551d7993405d56f8277ea063e41c636ddcd77975c652a625d758f3976aa21f45e9abf928306ca5f069ab40fc1f9dac881c600b987f5ffec1a8c14472854bd3a8fe37d1286c14a340e06b09dde91192f68b1181f41c969f85fe661aaaec0c27bac9ebab3e78e90819e1334486bc289027a4cca53f9efb6724af5f2e3f2f9b8e2a31a6ebd2edf8c74fe75e05f3e10484a140ca99801782068de7b4bef740c8e966f7236f62d1826ef1685db1ed07fa5b1332732483723f07a5e97e4d5960af9a49e585f416d25e5da99fc619f0717172129b3ab7e69c28d89b9f1bf94e0ae6b4b8708ea76af5f80fc5c3f7ce9927271ea28ff4156d2b2350a73ec0e7564d61f1131635ffa07f70eaacc2e11ef5fc5d3976dee39ca8543f796ab4ffabc80490b103b6995b4251669aa060380c9479ee716cff7f661d07e12c39afe697ee7979a71806dc9d87cb56d0ec34090cb76fd91335247789621a3643b0a61b68fa980ddb998c0da93060d0a93fe5f09ad66b352917706173a5371d128a085d76925507be0e86d2879304600d69858499546bd4b469fb5b8303fd6b0da94c71a6b8505427126ad87c35cc86920deff82e6b808d7aaaa2c7dfad1e35165c2b8dc9cf40aa6f43278eb06b1c36255008057432109dbba2531ca45333a425948dc46af13f44bacb79422c4fac925a417870d65444142f05911bfd9ef2082b698b550eeff83135570ebc33561872a27628f8e733afbf119e0cce9f449b74ce68180ca2350b8b311a7a6c1c111227d8fe40834cc0cf0bfb';

    const larosa_prv = new Fid_prv({privkey: privkey});

    Fid.find_partial_preimage(larosa, Fid_pub.inc_nonce, 20);

    const decrypted = await Fcrypto.decrypt_private_key(Buffer.from(privkey, "hex"), "mypassword");

    Fcrypto.set_privkey_func(() => {
        return new Promise((resolve, reject) => {
            resolve(decrypted);
        });
    });

    const network = new Fapp({fid_pub: larosa});
    await network.start();

    // Make a self-signature transaction, add it to our tx_cache, and broadcast it
    const tx_new = await network.fksrv.sign(larosa, larosa);
    network.fksrv.dlt.tx_cache.set(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx_new)));
    network.fksrv.dlt.broadcast(network.fksrv.dlt.tx_req, {fdlt_tsact: tx_new});   

    // Sign the bootstrap node, add it to our tx_cache, and broadcast it
    const bs_bro = new Fid_pub({
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100ae76dbab80b72039d8c3c31ccc39b8331b36b12cc41587180251d184a1c33de27c1213270eafb584f43d2bb734eca91054e23fd99be6be28c2eaf9e354b4c1a81f10673092a49d8c7d60a5eac7ac50be55a077ad0fae0364b21fb0ae2737e388c2b8c5b1c19ccfa197aceae3070be8152d763d0b80631733db824953e332743ae3c79c3299cd7edf9c362fd9f48fff53ab162a43196bdad5654a7045068c7ac3ca76efe5ebcd88fecac0ad2bd4406ff2452a5d50340e9b94302ea58918f2de9380eec4e0e249ab86cfe2ecbd87fd126494da7ee53cdb8ed9701aef22994cd875e007bb64f124e19d00cfb56e1f15e9e114b083188f5a7aefd01fb3f71dcc34170203010001'
    });

    const tx_new_2 = await network.fksrv.sign(larosa, bs_bro);
    network.fksrv.dlt.tx_cache.set(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx_new_2)));
    network.fksrv.dlt.broadcast(network.fksrv.dlt.tx_req, {fdlt_tsact: tx_new_2}); 

    // Wait 30 seconds and revoke my signature from the bootstrap node
    setTimeout(async () => {
        const tx_new_3 = await network.fksrv.revoke(larosa, bs_bro);
        network.fksrv.dlt.tx_cache.set(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx_new_3)));
        network.fksrv.dlt.broadcast(network.fksrv.dlt.tx_req, {fdlt_tsact: tx_new_3}); 

        console.log(network.fksrv.build_wot());

        setTimeout(() => {
            console.log(network.fksrv.build_wot());
            console.log(network.fksrv.compute_strong_set());
        }, 30000)
    }, 30000); 
})();
