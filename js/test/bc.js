const { Happ } = require("../src/happ/happ.js");
const { Hid } = require("../src/hid/hid.js");
const { Hid_pub } = require("../src/hid/hid_pub.js");
const { Hdlt_tsact } = require("../src/hdlt/hdlt_tsact.js");
const { Hdlt_vm } = require("../src/hdlt/hdlt_vm.js");

// The blockchain is just a list of transactions
const bc = [];

// Unspent output database
const utxo_db = new Map();

// The application layer will make sure there is a persistent unspent output in the database with the txid of 0xdead
// which maps to a transaction that will be used as tx_prev when a node creates a new transaction to spend 0xdead
// note that the application layer is responsible for ensuring that a node is allowed to spend 0xdead, so verifiers need to be vigilant here
// The unlock script is just OP_CHECKPOW 0x02, which allows anyone with a valid 2-bit proof of work to spend it
utxo_db.set("dead", new Hdlt_tsact({utxo: "beef", lock: [0x61], unlock: [0xFF, 0x02]}));

// Compute the state of the database by executing every state change in the blockchain
function compute_db(db) {
	// For every transaction in the blockchain:
	// 1. fetch its utxo from the db as tx_prev
	// 2. spin up a VM with tx_prev and tx_new
	// 3. execute the program; assuming all good, delete the utxo from the db and add tx_new to the db as a new utxo
	bc.forEach((tsact) => {
		const vm = new Hdlt_vm({tx_prev: utxo_db.get(tsact.utxo), tx_new: tsact});

		if (vm.exec()) {
			if (tsact.utxo === "dead") {
				// We add the new transaction to the db unless it's a revocation - any spend of a non 0xdead token is a revocation
				db.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tsact)), tsact);
			} else {
				// Only delete the utxo from the db if it's not the persistent 0xdead token!
				db.delete(tsact.utxo);
			}			
		} else {
			throw new Error("Transaction error, how did a bad tsact end up in the blockchain?");
		}
	});
}

// Generate an identity 
function makepeer(i = 0) {
	const kp = Happ.generate_key_pair();

	const hid = new Hid_pub({
		pubkey: kp.publicKey.toString("hex"),
		first: `Peer ${i}`,
		last: `McPearson`,
		address: `21 Peer St.`,
		phone: `666-666-6666`,
		lat: 0.0,
		long: 0.0
	});

	Hid.find_partial_preimage(hid, Hid_pub.inc_nonce, 2); // Can we set the leading zero bits this low or does this break something somewhere

	return {
		hid_pub: hid,
		private_key: kp.privateKey
	}
}

// Create a transaction for a signing: peer a spends 0xdead on peer b
function dosign(peer_a, peer_b, check_db = true) {
	const nonce_arr = Array.from(Buffer.from(peer_a.hid_pub.nonce, "hex"));
	const my_pubkey_arr = Array.from(Buffer.from(peer_a.hid_pub.pubkey, "hex"));
	const recip_pubkey_arr = Array.from(Buffer.from(peer_b.hid_pub.pubkey, "hex"));

	// lock script: push1, len, recip pubkey, push1, len, nonce, push1, len, my pubkey
	// (we ineffectually push the recipient's pubkey to the stack before our nonce and pubkey just so the recipient's pubkey is in the script for us to hash over)

	// unlock script: push1, len, payee (me) pubkey, checksig
	const tsact = new Hdlt_tsact({
		utxo: "dead",
		lock: [0x64].concat([recip_pubkey_arr.length, ...recip_pubkey_arr, 0x64, nonce_arr.length, ...nonce_arr, 0x64, my_pubkey_arr.length, ...my_pubkey_arr]),
		unlock: [0x64].concat([my_pubkey_arr.length, ...my_pubkey_arr, 0xAC]) 
	});	

	// If this tsact already exists in the utxo db, it means that peer_a has already spent 0xdead on peer_b, and it's illegal
	// this would be handled at the application layer
	if (check_db && utxo_db.has(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tsact)))) {
		return null;
	}

	return tsact;
}

// Create a transaction to revoke a prior signature: peer_a revokes their signature from peer_b
function revoke(peer_a, peer_b) {
	// The utxo is the hash of the transaction that created the signature
	const orig_tsact = dosign(peer_a, peer_b, false);
	const utxo = Hdlt_tsact.sha256(Hdlt_tsact.serialize(orig_tsact));

	// If the original tsact doesn't exist in the utxo db, it means that peer_a never signed peer_b, and revocation is illegal
	// this would be hanlded at the application layer
	if (!utxo_db.has(utxo)) {
		return null;
	}

	const new_tsact = new Hdlt_tsact({
		utxo: utxo,
		lock: [],
		unlock: [0x64].concat([0x01, 0x00]) // push1, len, 0 - ie, this transaction cannot be unlocked
	});

	const sig = Happ.sign(Hdlt_vm.make_sig_preimage(orig_tsact, new_tsact), peer_a.private_key);

	new_tsact.lock = [0x64, sig.length, ...Array.from(sig)] // push1, len, sig

	return new_tsact;
}

// Compute the db once to initialize it
compute_db(utxo_db);

// Make two peers, peer_0 and peer_1
const peer_0 = makepeer();
const peer_1 = makepeer(1);

// peer 0 signs peer 1
const tx_new = dosign(peer_0, peer_1); 

// This is what a validator would do: Spin up a VM, load the new transaction and the persistent 0xdead previous transaction
const vm = new Hdlt_vm({tx_prev: utxo_db.get("dead"), tx_new: tx_new});

// If the VM returns true, it's a valid new transaction -- add it to the blockchain
if (vm.exec()) {
	bc.push(tx_new);
}

compute_db(utxo_db);
console.log(utxo_db);

// peer 0 tries to sign peer 1 again
const tx_new_new = dosign(peer_0, peer_1);
console.log(tx_new_new);

// ***

// Make another peer, peer_2
const peer_2 = makepeer(2);

// peer_0 signs peer_2
const tx_new_for_2 = dosign(peer_0, peer_2);

// This is what a validator would do: Spin up a VM, load the new transaction and the persistent 0xdead previous transaction
const vm2 = new Hdlt_vm({tx_prev: utxo_db.get("dead"), tx_new: tx_new_for_2});

// If the VM returns true, it's a valid new transaction -- add it to the blockchain
if (vm2.exec()) {
	bc.push(tx_new_for_2);
}

compute_db(utxo_db);
console.log(utxo_db);

// peer 0 tries to sign peer 2 again
const tx_new_new_new = dosign(peer_0, peer_2);
console.log(tx_new_new_new);

// ***

// peer 2 signs peer 0
const tx_extra_new = dosign(peer_2, peer_0);

// This is what a validator would do: Spin up a VM, load the new transaction and the persistent 0xdead previous transaction
const vm3 = new Hdlt_vm({tx_prev: utxo_db.get("dead"), tx_new: tx_extra_new});

// If the VM returns true, it's a valid new transaction -- add it to the blockchain
if (vm3.exec()) {
	bc.push(tx_extra_new);
}

compute_db(utxo_db);
console.log(utxo_db);

// ***

// peer 2 revokes signature from peer 0
const rev = revoke(peer_2, peer_0)

// This is what a validator would do: Spin up a VM, load the new transaction and the persistent 0xdead previous transaction
const vm4 = new Hdlt_vm({tx_prev: utxo_db.get(rev.utxo), tx_new: rev});

// If the VM returns true, it's a valid new transaction -- add it to the blockchain
if (vm4.exec()) {
	bc.push(rev);
}

compute_db(utxo_db);
console.log(utxo_db);

// peer 2 tries to revoke peer 0 again
const rev_new = revoke(peer_2, peer_0);
console.log(rev_new);

// **

// peer 2 changes its mind and signs peer 0 again, after the revocation
const tx_again = dosign(peer_2, peer_0);

// This is what a validator would do: Spin up a VM, load the new transaction and the persistent 0xdead previous transaction
const vm5 = new Hdlt_vm({tx_prev: utxo_db.get("dead"), tx_new: tx_again});

// If the VM returns true, it's a valid new transaction -- add it to the blockchain
if (vm5.exec()) {
	bc.push(tx_again);
}

compute_db(utxo_db);
console.log(utxo_db);