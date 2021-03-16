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
        pubkey: '30820122300d06092a864886f70d01010105000382010f003082010a0282010100c8e6597fa0c97bfc295820ba4e897f3388cb68a548f04416d9a8d056bab07d9d774f453760db03278907723d9de7f98caa48403b9b34d71919def12272a47cc418bcda9096b5225f162cb98dbfc1e3e32bda691d1619f15de4b9f5c66903ae0895b05a9bd534c008d38937dba4d5e54f05deca0a1b84d5e0ad8deb65288bc132c1eaa05997a83dfbf4c55a956dda779df76192403599292be94fac47c09d0942716ddfb727ab45ec83a22419dc7f94897e27033b204d6ab90b521ab30be977756b171117899b365978feba7432464d32ef0f724c054ee50dfcc9f68b0188ce3c5c2f8522aedb055dde2e2ee9509c9ace8b11c2ec058dba5dc08be11cb4ad081d0203010001',
        name: "Pizzeria La Rosa",
        address: "12 Russell Ave. New Rochelle NY 10801",
        phone: "914-633-0800",
        lat: 40.9018663,
        long: -73.7912739
    });

    console.log(Hid.generate_key_pair("yeahbro"))

    const privkey = '-----BEGIN RSA PRIVATE KEY-----\n' +
    'Proc-Type: 4,ENCRYPTED\n' +
    'DEK-Info: AES-256-CBC,BCB9550FBAB5D927F63D829C0F0E5EA5\n' +
    '\n' +
    'UXv63xP/mzq0c8DcHYqrzXCY0QIWxhO5TII+GoHUAuu9AtNOnv98z64JcdrZL+fZ\n' +
    'w+LhYrRY/eovGTLeHGhKVXe1YYR/TmFL+9WkUTbYKAv8IiZJ0nrhwhp6OhhT2neI\n' +
    'rl6piBuEpuJfb7TPBfxc6c+fpHNiTqmNc5Br4JaYjwLxuzMOSa4kqDUt111BR8CT\n' +
    's2qTfXfRU/LisIc4KF9E5FU0X4C0j6+Y0Rv3SFvxFpyaM+dW0/5dQPG8QwOZNayb\n' +
    'teukzRgGq/ujHB7MGBBDWjPk/9pZzfzv49nEbjaZ9HzQi66hBr4HCTMhSYFNq0Ux\n' +
    'S5O9YHzpXoGu5NG8w9B0JMe84yw/DN9CB7mIaC2+1ZemoQYCAuI2zwtf6QFbcnkP\n' +
    'H5ZLWSbp4l0zNdRZJ9jJGpYHYcVrwufscLdGLR8lihor61s4rRr+0jT6CAp838jD\n' +
    '7VfEIXvNOqRTIuXjSpE7Cr+43gSsp8VhJmhR/yZwtAsJWvQpLMi1nACKKkD0lS5t\n' +
    '4vREznc0c0Y4BrP57jkDqOLJa6rBMR3AMMaMRke0iNyp/cDgSTWis3k7aLMmk4bK\n' +
    'uWhc4I9ROTF8K0F/7ZYQ6BVJ0pD859p3HYIaAsveejp6VaJnNQGqySf33r6CPLMk\n' +
    'YeEHasJXe2FoZVerX7Q0nBFxoqt3a6zdKuJ8M3GIyat8TnSfZLn+yo8pUKBwoe6j\n' +
    '2Ze6toXbZpiMHTU6hzH7Y3Tsx4GdyAVnYUWAD3/rj3CTAsuP3bT8BefhXS1wtv7f\n' +
    'WJDh32ts+QImwrxZUMIxDyhgcydl/ZkYe7gqLpkAkGBnQoP3Zk4nTOdsaUfwqPhL\n' +
    'nrSIODAqA2lCBsAIElOWX7UE1KiEf6vq0nLw60U3lLyNI5SsVjJ+cBkT7352zaQD\n' +
    'KSRCFHkmT/Cj5LGVIedI3TVH5L63wetzXcL1gYiWBz3LzGhjmjIuo5xmMbrWE5/l\n' +
    'Ra/RkY39GrTbw66EsnC7lB1zphf7DjzEYB8oFId+a31mnwBF00IoNjuksHbC5pwr\n' +
    'h8gpsBrsGyVoT0ZD0Bh1mGZ5kRZ6yHBET4k9uEtyXuYReDecKSzf/KH34ccJjK0Y\n' +
    'cyMIyXfa/8GBSs2YqpZJactxeFzDmYD63WpZucLwHn9Oegy2kQbzb5lWIRzClqvb\n' +
    'NQN2L6dHBq9bmHFnFSlvMN4MQMokUAJhQxvVhKluZKdkFessmjBQbyY6uKQU7wnL\n' +
    'vQSzjmxE1qq7ZWnRYpJ/7pxDQgPweEVWCRWTvFjvszM1ElI7sr5kGxpD5UEeVbjM\n' +
    'i6xqgN7zC1uE5xPqjoxDiGNqw3tSlH6OVyJ9Xk2uH5W7jsIj6S0pFfNeXvNysNX3\n' +
    '1I5wNT2FuSnKOX1J7sMcLSEPT5B6WOPmfW8m4g4q/Yo19sNT/6uLkvxPNvxy20Hg\n' +
    'HZhxdVyyr9lz8c2UXK8N9nGa38l0EYpCjtTHXzk9ANxTd4bXmJZsJ3RfrQdSeMiY\n' +
    'bkS5rhfRAjae9051DOkCi5gjdDsdB0yn3zUQ295ZyPnKO0VH0sw2KxgUiVskQ0et\n' +
    'U+E6MJpqMxdZx3OvJlGXHh3FSxgQszLMJ7a66p7ni/1LFSwxlN/Q6U2WkGM5IPj5\n' +
    '-----END RSA PRIVATE KEY-----\n'

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
