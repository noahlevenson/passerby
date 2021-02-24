const { Happ } = require("../src/happ/happ.js");
const { Hdlt_tsact } = require("../src/hdlt/hdlt_tsact.js");
const { Hdlt_vm } = require("../src/hdlt/hdlt_vm.js");

const key_pair = Happ.generate_key_pair();

const sig = Happ.sign(Buffer.from("foo"), key_pair.privateKey);
console.log(Happ.verify(Buffer.from("foo"), key_pair.publicKey, sig));

// To create the lock script, which should just be the signature, we:
// create a transaction where the lock script is the unlock script of the utxo transaction
// (for this special 'dead' token, we have to make some bullshit up, bc there is no unlock script)
// then serialize that transaction, sha256 it, and then encrypt it using our public key

const tx_prev = new Hdlt_tsact({
	utxo: "dead",
	lock: [],
	unlock: [0x64, 0xAC]
});

// const tx_new = new Hdlt_tsact({

// });

// const vm = new Hdlt_vm({tx_prev: tx_prev, tx_new: tx_new});

console.log(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_prev)));

//console.log(vm);