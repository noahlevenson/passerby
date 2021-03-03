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
const { Hdlt } = require("../hdlt/hdlt.js");
const { Hdlt_tsact } = require("../hdlt/hdlt_tsact.js");
const { Hdlt_vm } = require("../hdlt/hdlt_vm.js");
const { Hdlt_block } = require("../hdlt/hdlt_block.js");

// The keyserver is an application layer built atop HDLT which provides a distributed database 
// of public keys and a record of relationships between keys in the form of signatures:
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
	
	utxo_db;
	dlt;
	
	constructor ({app_id, authorities = []} = {}) {
		const tok = new Hdlt_tsact({
			utxo: Hksrv.SIG_TOK.split("").reverse().join(""), 
			lock: [Hdlt_vm.OPCODE.OP_NOOP], 
			unlock: [Hdlt_vm.OPCODE.OP_CHECKPOW, Hksrv.REQ_POW_BITS]
		})

		this.utxo_db = new Map([[Hksrv.SIG_TOK, tok]]);
		
		this.dlt = new Hdlt({
			consensus: Hdlt.CONSENSUS_METHOD.AUTH, 
			args: [...authorities], 
			app_id: app_id
		});
	}

	// Create a signing transaction: peer_a spends SIG_TOK on peer_b
	sign(peer_a, peer_b, check_db = true) {
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
		if (check_db && this.utxo_db.has(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tsact)))) {
			return null;
		}

		return tsact;
	}

	// Create a revocation transaction: peer_a revokes SIG_TOK from peer_b
	revoke(peer_a, peer_a_prv, peer_b) {
		const prev_tsact = Hksrv.sign(peer_a, peer_b, false);
		const utxo = Hdlt_tsact.sha256(Hdlt_tsact.serialize(prev_tsact));

		// If the original tsact doesn't exist in the db, then peer_a hasn't signed peer_b
		if (!this.utxo_db.has(utxo)) {
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

	// Compute the state of the utxo db from our DLT's array of blocks
	// start = 1 will compute state transitions starting from the genesis block
	// Returns null on success, or a ref to the first block that failed integrity check
	compute_db(start = 1) {
		for (let i = start; i < this.dlt.blocks.length; i += 1) {
			if (!this.dlt.is_valid_block(i)) {
				this.utxo_db.clear();
				return blocks[i];
			}

			this.dlt.blocks[i].tsacts.forEach((tsact) => {
				const vm = new Hdlt_vm({tx_prev: this.utxo_db.get(tsact.utxo), tx_new: tsact});

				// For this application, no transaction should have an exit value of 0
				if (!vm.exec()) {
					return blocks[i];
				}
				
				if (tsact.utxo === Hksrv.SIG_TOK) {
					// We add the new transaction to the db unless it's a revocation - any spend of a non-SIG_TOK utxo is a revocation
					this.utxo_db.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tsact)), tsact);
				} else {
					// Only delete the utxo from the db if it's not SIG_TOK!
					this.utxo_db.delete(tsact.utxo);
				}			
			});
		}

		return null;
	}
}

module.exports.Hksrv = Hksrv;