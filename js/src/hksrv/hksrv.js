/** 
* HKSRV
* Distributed ledger-based keyserver
* for web-of-trust-ish system of peer-signed
* certificates
*
*
*/

"use strict";

const { Happ } = require("../happ/happ.js");
const { Hdlt_tsact } = require("../hdlt/hdlt_tsact.js");
const { Hdlt_vm } = require("../hdlt/hdlt_vm.js");

// The keyserver is an application layer built atop HDLT which provides some simple functionality:
// A peer signs another peer's key by spending a persistent token, SIG_TOK; all peers may spend
// SIG_TOK exactly once for every other peer known to the keyserver. A peer registers his new
// key with the keyserver by signing his own key. Peers may revoke their signatures, except
// in the case of self-signatures, which are made permanent via SCRIPT_NO_UNLOCK. Anytime a peer
// spends SIG_TOK to sign a peer's key, they must present a valid proof of work for their identity,
// which is enforced with SCRIPT_IS_VALID_POW.

class Hksrv {
	static REQ_POW_BITS = 0x02; // TODO: set to nontrivial value
	static SIG_TOK = Buffer.from([0xDE, 0xAD]).toString("hex");
	static SCRIPT_NO_UNLOCK = [Hdlt_vm.OPCODE.OP_PUSH1, 0x01, 0x00];
	static SCRIPT_IS_VALID_POW = [Hdlt_vm.OPCODE.OP_CHECKPOW, Hksrv.REQ_POW_BITS];
	static UTXO_DB = new Map();
	
	constructor () {

	}

	// Create a signing transaction: peer_a spends SIG_TOK on peer_b
	static sign(peer_a, peer_b, check_db = true) {
		const nonce = Array.from(Buffer.from(peer_a.nonce, "hex"));
		const peer_a_pubkey = Array.from(Buffer.from(peer_a.pubkey, "hex"));
		const peer_b_pubkey = Array.from(Buffer.from(peer_b.pubkey, "hex"));

		// lock script: push1, len, recip pubkey, push1, len, nonce, push1, len, my pubkey
		// (we ineffectually push the recipient's pubkey to the stack just so the 
		// recipient's pubkey is in the script for us to hash over)
		const lock_script = [].concat([
			Hdlt_vm.OPCODE.OP_PUSH1,
			peer_b_pubkey.length, 
			...peer_b_pubkey, 
			Hdlt_vm.OPCODE.OP_PUSH1, 
			nonce.length, 
			...nonce, 
			Hdlt_vm.OPCODE.OP_PUSH1, 
			peer_a_pubkey.length, 
			...peer_a_pubkey
		]);

		// unlock script (if not self-sig): push1, len, payee (self) pubkey, checksig
		// (the only peer who may unlock this transaction is the peer who created this transaction)
		const unlock_script = peer_a === peer_b ? Hksrv.SCRIPT_NO_UNLOCK : 
			[].concat([Hdlt_vm.OPCODE.OP_PUSH1, peer_a_pubkey.length, ...peer_a_pubkey, Hdlt_vm.OPCODE.OP_CHECKSIG]);

		const tsact = new Hdlt_tsact({
			utxo: Hksrv.SIG_TOK,
			lock: lock_script,
			unlock: unlock_script
		});	

		// If this tsact already exists in the db, it means that peer_a has already spent SIG_TOK on peer_b
		if (check_db && Hksrv.UTXO_DB.has(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tsact)))) {
			return null;
		}

		return tsact;
	}

	// Create a revocation transaction: peer_a revokes SIG_TOK from peer_b
	static revoke(peer_a, peer_a_prv, peer_b) {
		const prev_tsact = Hksrv.sign(peer_a, peer_b, false);
		const utxo = Hdlt_tsact.sha256(Hdlt_tsact.serialize(prev_tsact));

		// If the original tsact doesn't exist in the db, then peer_a hasn't signed peer_b
		if (!Hksrv.UTXO_DB.has(utxo)) {
			return null;
		}

		const tsact = new Hdlt_tsact({
			utxo: utxo,
			lock: [],
			unlock: Hksrv.SCRIPT_NO_UNLOCK
		});

		const sig = Happ.sign(Hdlt_vm.make_sig_preimage(prev_tsact, tsact), peer_a_prv.get_privkey());
		tsact.lock = [Hdlt_vm.OPCODE.OP_PUSH1, sig.length, ...Array.from(sig)] // push1, len, sig
		return tsact;
	}
}

module.exports.Hksrv = Hksrv;