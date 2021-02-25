const { Happ } = require("../src/happ/happ.js");
const { Hdlt_tsact } = require("../src/hdlt/hdlt_tsact.js");
const { Hdlt_vm } = require("../src/hdlt/hdlt_vm.js");

const my_key_pair = Happ.generate_key_pair();

const my_pubkey = Array.from(my_key_pair.publicKey)

const payee_key_pair = Happ.generate_key_pair();

const payee_pubkey = Array.from(payee_key_pair.publicKey);

// Let's just run through the first transaction for a given signature -- you'd have a peer submitting a tx_new trying to spend the "dead" token
// and the application layer would make up a tx_prev and submit it to the VM

// To create the lock script, which should just be push1 len signature, we:
// create a transaction where the lock script is the unlock script of the utxo transaction
// (for this special 'dead' token, we have to make some bullshit up, bc there is no unlock script)
// then serialize that transaction, sha256 it, and then encrypt it using our public key

// You need to get the signature over this transaction, but with the unlock script of the utxo swapped in where the lock script will go
// So what's the unlock script that the application layer will include in the made up tx_prev for 0xDEAD transactions?
// Duh, it's the same as our standard unlock script (push len payee pubkey checksig), but with my pubkey as the payee

const prev_unlock = [0x64].concat(my_pubkey.length, my_pubkey, 0xAC);

// Temp is just used so we can create an image of our new transaction but with the previous unlock script in place of what will become the lock script
const temp = new Hdlt_tsact({
	utxo: "dead",
	lock: [...prev_unlock],
	unlock: [0x64].concat(payee_pubkey.length, payee_pubkey, 0xAC)
});

const sig = Happ.sign(Hdlt_tsact.serialize(temp), my_key_pair.privateKey);

const tx_new = new Hdlt_tsact({
	utxo: "dead",
	lock: [0x64].concat(sig.length, Array.from(sig)), // push1, len, sig
	unlock: [0x64].concat(payee_pubkey.length, payee_pubkey, 0xAC) // push1, len, payee pubkey, checksig
});

// In the case of the dead token, since there's no tx_prev on record, it will be supplied by the API layer, as a constant

const tx_prev = new Hdlt_tsact({
	utxo: "beef",
	lock: [], // We just use a null lock script since this is the genesis of the token?
	unlock: [...prev_unlock]
});


const vm = new Hdlt_vm({tx_prev: tx_prev, tx_new: tx_new});

// console.log(vm);

console.log(vm.exec())

// console.log(tx_new)

// console.log(Hdlt_tsact.serialize(tx_new))

// console.log(Hdlt_tsact.from(Hdlt_tsact.serialize(tx_new)))

// const vm = new Hdlt_vm({tx_prev: tx_prev, tx_new: tx_new});

/// console.log(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new)));

//console.log(vm);