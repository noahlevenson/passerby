const { Happ } = require("../src/happ/happ.js");
const { Hntree_node } = require("../src/htypes/hntree/hntree_node.js");
const { Hid } = require("../src/hid/hid.js");
const { Hid_pub } = require("../src/hid/hid_pub.js");
const { Hid_prv } = require("../src/hid/hid_prv.js");
const { Hdlt } = require("../src/hdlt/hdlt.js");
const { Hdlt_net_solo } = require("../src/hdlt/net/hdlt_net_solo.js");
const { Htrans_udp } = require("../src/htrans/trans/htrans_udp.js");
const { Hksrv } = require("../src/hksrv/hksrv.js");
const { Hdlt_block } = require("../src/hdlt/hdlt_block.js");

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

	Hid.find_partial_preimage(hid, Hid_pub.inc_nonce, 2);

	return {
		hid_pub: hid,
		hid_prv: new Hid_prv({privkey: kp.privateKey})
	}
}

// Create two peers, peer 0 and peer 1
const peer_0 = makepeer();
const peer_1 = makepeer(1);

// Stand up a keyserver where peers 0 and 1 are the designated consensus authorities
const dlt = new Hdlt({
	net: new Hdlt_net_solo(new Htrans_udp(), "keyserver1"),
	args: [peer_0.hid_pub.pubkey, peer_1.hid_pub.pubkey]
});

const ks = new Hksrv({
	dlt: dlt 
});

console.log(ks);

// Create peer 2 and peer 3
const peer_2 = makepeer(2);
const peer_3 = makepeer(3);

// Peer 2 signs peer 3
const tx_new_1 = ks.sign(peer_2.hid_pub, peer_3.hid_pub);

// Here's where peer 2 would broadcast their new signature transaction to the network
// authority peer 0 receives it, verifies it, puts it in a block, signs it
const new_block_1 = new Hdlt_block({prev_block: ks.dlt.get_deepest_blocks()[0].data, tsacts: [tx_new_1]});
new_block_1.nonce = Hdlt.make_nonce_auth(new_block_1, peer_0.hid_pub.pubkey, peer_0.hid_prv.get_privkey());

// Here's where peer 0 would broadcast their new block back to the network
// peer 2 receives it, confirms that it's the block which follows
// our last block, verifies its nonce, and adds it to his chain
if (Hdlt_block.sha256(ks.dlt.get_deepest_blocks()[0].data) !== new_block_1.hash_prev) {
	throw new Error("The new block ain't it bro");
}

console.log(ks.dlt.verify_nonce(new_block_1));
const p1 = ks.dlt.get_deepest_blocks()[0];
p1.add_child(new Hntree_node({data: new_block_1, parent: p1}));

// Adversary test: peer 3 tries to pretend he's an authority and creates a signed block
const bad_block_1 = new Hdlt_block({prev_block: ks.dlt.get_deepest_blocks()[0].data, tsacts: [tx_new_1]});
bad_block_1.nonce = Hdlt.make_nonce_auth(bad_block_1, peer_3.hid_pub.pubkey, peer_3.hid_prv.get_privkey());

// It doesn't pass nonce integrity check
console.log(ks.dlt.verify_nonce(bad_block_1));

// Now peer 2 computes the state of the utxo db (null indicates success)
console.log(ks.compute_db(ks.dlt.get_deepest_blocks()[0]));
console.log(ks.utxo_db);

// Peer 2 tries to sign peer 3 again
// (His client rejects it)
const tx_new_2 = ks.sign(peer_2.hid_pub, peer_3.hid_pub);
console.log(tx_new_2);

// Peer 2 signs peer 0
const tx_new_3 = ks.sign(peer_2.hid_pub, peer_0.hid_pub);
console.log(tx_new_3);

// Peer 2 revokes his signature from peer 3
const tx_rev_1 = ks.revoke(peer_2.hid_pub, peer_2.hid_prv, peer_3.hid_pub);
console.log(tx_rev_1);

// Here's where peer 2 would broadcast their two new transactions to the network
// authority peer 1 receives them, verifies them, puts em in a block and signs it
const new_block_2 = new Hdlt_block({prev_block: ks.dlt.get_deepest_blocks()[0].data, tsacts: [tx_new_3, tx_rev_1]});
new_block_2.nonce = Hdlt.make_nonce_auth(new_block_2, peer_1.hid_pub.pubkey, peer_1.hid_prv.get_privkey());

if (Hdlt_block.sha256(ks.dlt.get_deepest_blocks()[0].data) !== new_block_2.hash_prev) {
	throw new Error("The new block ain't it bro");
}

console.log(ks.dlt.verify_nonce(new_block_2));
const p2 = ks.dlt.get_deepest_blocks()[0];
p2.add_child(new Hntree_node({data: new_block_2, parent: p2}));

// Again peer 2 computes the state of the utxo db (null indicates success)
console.log(ks.compute_db(ks.dlt.get_deepest_blocks()[0]));
console.log(ks.utxo_db);

// Peer 2 tries to revoke his signature from peer 3 again
// (His client rejects it)
const tx_rev_2 = ks.revoke(peer_2.hid_pub, peer_2.hid_prv, peer_3.hid_pub);
console.log(tx_rev_2);

// Peer 2 changes his mind and signs peer 3 again
const tx_new_4 = ks.sign(peer_2.hid_pub, peer_3.hid_pub);
console.log(tx_new_4);

// Here's where peer 2 would broadcast his new transaction to the network
// authority peer 1 receives it, verifies it, puts it in a block and signs it
const new_block_3 = new Hdlt_block({prev_block: ks.dlt.get_deepest_blocks()[0].data, tsacts: [tx_new_4]});
new_block_3.nonce = Hdlt.make_nonce_auth(new_block_3, peer_1.hid_pub.pubkey, peer_1.hid_prv.get_privkey());

if (Hdlt_block.sha256(ks.dlt.get_deepest_blocks()[0].data) !== new_block_3.hash_prev) {
	throw new Error("The new block ain't it bro");
}

console.log(ks.dlt.verify_nonce(new_block_3));
const p3 = ks.dlt.get_deepest_blocks()[0];
p3.add_child(new Hntree_node({data: new_block_3, parent: p3}));

// Again peer 2 computes the state of the utxo db (null indicates success)
console.log(ks.compute_db(ks.dlt.get_deepest_blocks()[0]));
console.log(ks.utxo_db);

// Peer 2 signs his own key
const tx_new_5 = ks.sign(peer_2.hid_pub, peer_2.hid_pub);
console.log(tx_new_5);

// Here's where peer 2 would broadcast his new transaction to the network
// authority peer 0 receives it, verifies it, puts it in a block and signs it
const new_block_4 = new Hdlt_block({prev_block: ks.dlt.get_deepest_blocks()[0].data, tsacts: [tx_new_5]});
new_block_4.nonce = Hdlt.make_nonce_auth(new_block_4, peer_0.hid_pub.pubkey, peer_0.hid_prv.get_privkey());

if (Hdlt_block.sha256(ks.dlt.get_deepest_blocks()[0].data) !== new_block_4.hash_prev) {
	throw new Error("The new block ain't it bro");
}

console.log(ks.dlt.verify_nonce(new_block_4));
const p4 = ks.dlt.get_deepest_blocks()[0];
p4.add_child(new Hntree_node({data: new_block_4, parent: p4}));

// Peer 2 tries to revoke his own signature
// (His client rejects it)
const tx_rev_3 = ks.revoke(peer_2.hid_pub, peer_2.hid_prv, peer_2.hid_pub);
console.log(tx_rev_3);

// Tests:
// 1. spend SIG_TOK on a peer -- DONE
// 2. try to double spend SIG_TOK on a peer (should fail) -- DONE
// 3. spend SIG_TOK on a different peer -- DONE
// 4. revoke SIG_TOK from a peer -- DONE
// 5. double-revoke SIG_TOK from a peer (should fail) -- DONE
// 6. after revocation, re-spend SIG_TOK on the peer -- DONE
// 7. revoke self-signature (should fail) -- DONE