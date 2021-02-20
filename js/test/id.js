const { Hid } = require("../src/hid/hid.js")
const { Hid_pub } = require("../src/hid/hid_pub.js");

const plr = new Hid_pub({
    pubkey: `${Math.random()}`,
    name: "Pizzeria La Rosa",
    address: "12 Russell Ave. New Rochelle NY 10803",
    phone: "914-633-0800",
    lat: 40.90398,
    long: -73.7908
});

console.log(Hid.hash_cert(plr));

const t1 = Date.now();
console.log(Hid.find_partial_preimage(plr, (x) => x.nonce += 1, 20));
const t2 = Date.now();

console.log(Hid.hash_cert(plr, true));

const elapsed = (t2 - t1) / 1000;

console.log(`${elapsed} seconds`);

const i = Hid.get_symbol_indices(plr);
console.log(i);
console.log(`${Hid.SYM_ADJ_A[i[0]]} ${Hid.SYM_ADJ_B[i[1]]} ${Hid.SYM_NOUN[i[2]]}\n\n`)
