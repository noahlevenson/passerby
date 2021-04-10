const { Fid } = require("../src/fid/fid.js")
const { Fid_pub } = require("../src/fid/fid_pub.js");

const plr = new Fid_pub({
    pubkey: `${Math.random()}`,
    name: "Pizzeria La Rosa",
    address: "12 Russell Ave. New Rochelle NY 10803",
    phone: "914-633-0800",
    lat: 40.90398,
    long: -73.7908
});

console.log(Fid.hash_cert(plr));

const t1 = Date.now();
console.log(Fid.find_partial_preimage(plr, Fid_pub.inc_nonce, 20));
const t2 = Date.now();

console.log(Fid.hash_cert(plr, true));

const elapsed = (t2 - t1) / 1000;

console.log(`${elapsed} seconds`);

const i = Fid.get_symbol_indices(plr);
console.log(i);
console.log(`${Fid.SYM_ADJ_A[i[0]]} ${Fid.SYM_ADJ_B[i[1]]} ${Fid.SYM_NOUN[i[2]]}\n\n`)
