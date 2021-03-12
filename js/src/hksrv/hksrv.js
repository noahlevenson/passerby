/** 
* HKSRV
* Distributed ledger-based keyserver
* for web-of-trust-ish system of peer-signed
* certificates
*
*
*/

"use strict";

const { Hid } = require("../hid/hid.js");
const { Hdlt } = require("../hdlt/hdlt.js");
const { Hdlt_net_solo } = require("../hdlt/net/hdlt_net_solo.js");
const { Hdlt_tsact } = require("../hdlt/hdlt_tsact.js");
const { Hdlt_vm } = require("../hdlt/hdlt_vm.js");
const { Hdlt_block } = require("../hdlt/hdlt_block.js");
const { Hlog } = require("../hlog/hlog.js");

// The keyserver is an application layer built atop HDLT which provides a distributed database 
// of public keys and a record of relationships between keys in the form of signatures:
// A peer signs another peer's key by spending a persistent token, SIG_TOK; all peers may spend
// SIG_TOK exactly once for every other peer known to the keyserver. A peer registers his new
// key with the keyserver by signing his own key. Peers may revoke their signatures, except
// in the case of self-signatures, which are made permanent via SCRIPT_NO_UNLOCK. Anytime a peer
// spends SIG_TOK to sign a peer's key, they must present a valid proof of work for their identity,
// which is enforced with SCRIPT_IS_VALID_POW.

class Hksrv {
	static REQ_POW_BITS = 20; // TODO: set to nontrivial value
	static SIG_TOK = Buffer.from([0xDE, 0xAD]).toString("hex");
	static SCRIPT_NO_UNLOCK = [Hdlt_vm.OPCODE.OP_PUSH1, 0x01, 0x00];
	static SCRIPT_IS_VALID_POW = [Hdlt_vm.OPCODE.OP_CHECKPOW, Hksrv.REQ_POW_BITS];

	// The application layer tx validation hook is where you specify any special validation logic for 
	// transactions beyond what's applied by the Hdlt layer - should return true if valid, false if not
	static TX_VALID_HOOK(tx_new, utxo_db) {
		// TODO: make sure that tx_new only has the scripts it's allowed to have

		// If tx_new is spending SIG_TOK and it already exists in the db, that's a double signature spend
		if (tx_new.utxo === Hksrv.SIG_TOK && utxo_db.has(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new)))) {
			return false;
		}

		// TODO: the specific case where a peer tries to revoke a signature that it never issued should be covered
		// by the general case where we validate the unspent output in Hdlt._res_block - but test this!
		
		return true;
	};

	// The application layer UTXO DB hook is is expected to modify a utxo db Map as necessary when
	// accepting a new valid transaction, including any special logic that's unique to this 
	// application (the default behavior would be just to set tx_new)
	static UTXO_DB_HOOK(tx_new, utxo_db) {
		// Only add the new transaction to the db if it's a signature
		// Only delete the unspent output from the db if it's not SIG_TOK
		if (tx_new.utxo === Hksrv.SIG_TOK) {
			utxo_db.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new)), tx_new);
		} else {
			utxo_db.delete(tx_new.utxo);
		}

		return utxo_db;
	}

	// The application layer UTXO DB init hook is for anything special you want to do to
	// a utxo db Map at initialization time, before computing the state of the db
	// this is called in Hdlt.build_db
	static UTXO_DB_INIT_HOOK(utxo_db) {
		// Here we just set our persistent signature token
		const tok = new Hdlt_tsact({
			utxo: Hksrv.SIG_TOK.split("").reverse().join(""), 
			lock: [Hdlt_vm.OPCODE.OP_NOOP], 
			unlock: [Hdlt_vm.OPCODE.OP_CHECKPOW, Hksrv.REQ_POW_BITS]
		})

		utxo_db.set(Hksrv.SIG_TOK, tok);
		return utxo_db;
	}

	// TODO: We should implement an Hdlt "application layer" base class to accommodate the above hooks
	// and other contracts and Hksrv should subclass it
	
	dlt;
	
	constructor ({dlt} = {}) {
		this.dlt = dlt;
	}

	start() {
		this.dlt.start();
		Hlog.log(`[HKSRV] (${this.dlt.net.app_id}) Online`);
	}

	stop() {
		this.dlt.stop();
		Hlog.log(`[HKSRV] (${this.dlt.net.app_id}) Offline`);
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

		if (check_db) {
			// We want to prevent the peer from double spending SIG_TOK on peer_b
			// if we've got an unresolved accidental fork, we need to consider all the branches
			const dbs = this.dlt.store.get_deepest_blocks().map(node => this.dlt.build_db(node));
			const double_spend = dbs.some(db => db.has(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tsact))));

			if (double_spend) {
				return null;
			}
		}

		return tsact;
	}

	// Create a revocation transaction: peer_a revokes SIG_TOK from peer_b
	// a revocation basically spends a spent SIG_TOK, but then directs the new utxo to /dev/null
	revoke(peer_a, peer_a_prv, peer_b) {
		const prev_tsact = this.sign(peer_a, peer_b, false);
		const utxo = Hdlt_tsact.sha256(Hdlt_tsact.serialize(prev_tsact));

		// We want to prevent the peer from issuing a revocation for a signature that doesn't exist
		// if we've got an unresolved accidental fork, we need to consider all the branches
		const dbs = this.dlt.store.get_deepest_blocks().map(node => this.dlt.build_db(node));
		const has_utxo = dbs.some(db => db.has(utxo));

		if (!has_utxo) {
			return null;
		}

		const tsact = new Hdlt_tsact({
			utxo: utxo,
			lock: [],
			unlock: Hksrv.SCRIPT_NO_UNLOCK
		});

		const sig = Hid.sign(Hdlt_vm.make_sig_preimage(prev_tsact, tsact), peer_a_prv.get_privkey());
		tsact.lock = [Hdlt_vm.OPCODE.OP_PUSH1, sig.length, ...Array.from(sig)] // push1, len, sig
		return tsact;
	}
}

module.exports.Hksrv = Hksrv;