/** 
* HKSRV
* Distributed ledger-based keyserver
* for web-of-trust-ish system of peer-signed
* certificates
*
*
*/

"use strict";

const { Happ_env } = require("../happ/happ_env.js");
const { Hid } = require("../hid/hid.js");
const { Hdlt } = require("../hdlt/hdlt.js");
const { Hdlt_net_solo } = require("../hdlt/net/hdlt_net_solo.js");
const { Hdlt_tsact } = require("../hdlt/hdlt_tsact.js");
const { Hdlt_vm } = require("../hdlt/hdlt_vm.js");
const { Hdlt_block } = require("../hdlt/hdlt_block.js");
const { Hgraph } = require("../htypes/hgraph/hgraph.js"); 
const { Hlog } = require("../hlog/hlog.js");
const { Hutil } = require("../hutil/hutil.js");

// The keyserver is an application layer built atop HDLT which provides a distributed database 
// of public keys and a record of relationships between keys in the form of signatures and revocations:
// A peer signs another peer's key by spending a persistent token, SIG_TOK. A peer revokes his signature
// from another peer by spending a persistent token, REV_TOK. Peers may double spend SIG_TOK and REV_TOK,
// we interpret transactions idempotently. A peer registers his new key with the keyserver by signing
// his own key. Peers may not revoke their self-signature. Anytime a peer spends SIG_TOK or REV_TOK,
// they must present a signature for proof of identity and a valid proof of work for their identity,
// which is enforced with SCRIPT_IS_VALID_SIG_AND_POW.

class Hksrv {
	static REQ_POW_BITS = Hid.POW_LEAD_ZERO_BITS;
	static SIG_TOK = Buffer.from([0xDE, 0xAD]).toString("hex");
	static REV_TOK = Buffer.from([0xBE, 0xEF]).toString("hex");
	static SCRIPT_NO_UNLOCK = [Hdlt_vm.OPCODE.OP_PUSH1, 0x01, 0x00];
	static SCRIPT_IS_VALID_SIG_AND_POW = [Hdlt_vm.OPCODE.OP_CHECKSIGPOW, Hksrv.REQ_POW_BITS];

	static SIG_TX = new Hdlt_tsact({
		utxo: Hksrv.SIG_TOK.split("").reverse().join(""), 
		lock: [Hdlt_vm.OPCODE.OP_NOOP], 
		unlock: Hksrv.SCRIPT_IS_VALID_SIG_AND_POW,
		t: 31337
	});

	static REV_TX = new Hdlt_tsact({
		utxo: Hksrv.REV_TOK.split("").reverse().join(""),
		lock: [Hdlt_vm.OPCODE.OP_NOOP],
		unlock: Hksrv.SCRIPT_IS_VALID_SIG_AND_POW,
		t: 31337
	})

	// The application layer tx validation hook is where you specify any special validation logic for 
	// transactions beyond what's applied by the Hdlt layer - should return true if valid, false if not
	static TX_VALID_HOOK(tx_new, utxo_db) {
		// TODO: make sure that tx_new only has the scripts it's allowed to have
		// TODO: make sure that tx_new is not a self-spend of REV_TOK - though we might instead enforce that in the unlock script for REV_TOK
		return true;
	};

	// The application layer UTXO DB hook is is expected to modify a utxo db Map as necessary when
	// accepting a new valid transaction, including any special logic that's unique to this 
	// application (the default behavior would be just to set tx_new)
	static UTXO_DB_HOOK(tx_new, utxo_db) {
		utxo_db.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx_new)), tx_new);
		return utxo_db;
	}

	// The application layer UTXO DB init hook is for anything special you want to do to
	// a utxo db Map at initialization time, before computing the state of the db
	// this is called in Hdlt.build_db
	static UTXO_DB_INIT_HOOK(utxo_db) {
		// Here we just set our persistent signature and revocation token
		utxo_db.set(Hksrv.SIG_TOK, Hksrv.SIG_TX);
		utxo_db.set(Hksrv.REV_TOK, Hksrv.REV_TX);
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

	// TODO: We're currently preserving separate sign and revoke functions for compatability, but
	// these functions can be collapsed into one parameterized function

	// Create a signing transaction: peer_a spends SIG_TOK on peer_b
	async sign(peer_a, peer_b) {
		const nonce = Array.from(Buffer.from(peer_a.nonce, "hex"));
		const peer_a_pubkey = Array.from(Buffer.from(peer_a.pubkey, "hex"));
		const peer_b_pubkey = Array.from(Buffer.from(peer_b.pubkey, "hex"));

		// Since we're currently allowing double spends and interpreting all transactions idempotently,
		// just lock this output forever
		const tsact = new Hdlt_tsact({
			utxo: Hksrv.SIG_TOK,
			lock: [],
			unlock: Hksrv.SCRIPT_NO_UNLOCK
		});	

		const privkey = await Hid.get_privkey();
		const sig = await Hid.sign(Hdlt_vm.make_sig_preimage(Hksrv.SIG_TX, tsact), Buffer.from(privkey, "hex"));

		// lock script: push2, len, recip pubkey, push2, len, sig, push2, len, nonce, push2, len, my pubkey
		// (we ineffectually push the recipient's pubkey to the stack just so the recipient's pubkey is in the script)
		const lock_script = [].concat([
			Hdlt_vm.OPCODE.OP_PUSH2,
			...Array.from(Hutil._int2Buf16(peer_b_pubkey.length)),
			...peer_b_pubkey, 
			Hdlt_vm.OPCODE.OP_PUSH2,
			...Array.from(Hutil._int2Buf16(sig.length)),
			...sig,
			Hdlt_vm.OPCODE.OP_PUSH2, 
			...Array.from(Hutil._int2Buf16(nonce.length)), 
			...nonce, 
			Hdlt_vm.OPCODE.OP_PUSH2, 
			...Array.from(Hutil._int2Buf16(peer_a_pubkey.length)), 
			...peer_a_pubkey
		]);

		tsact.lock = lock_script;
		return tsact;
	}

	// Create a revocation transaction: peer_a spends REV_TOK on peer_b
	async revoke(peer_a, peer_b) {
		const nonce = Array.from(Buffer.from(peer_a.nonce, "hex"));
		const peer_a_pubkey = Array.from(Buffer.from(peer_a.pubkey, "hex"));
		const peer_b_pubkey = Array.from(Buffer.from(peer_b.pubkey, "hex"));

		// Since we're currently allowing double spends and interpreting all transactions idempotently,
		// just lock this output forever
		const tsact = new Hdlt_tsact({
			utxo: Hksrv.REV_TOK,
			lock: [],
			unlock: Hksrv.SCRIPT_NO_UNLOCK
		});

		const privkey = await Hid.get_privkey();
		const sig = await Hid.sign(Hdlt_vm.make_sig_preimage(Hksrv.REV_TX, tsact), Buffer.from(privkey, "hex"));

		// lock script: push2, len, recip pubkey, push2, len, sig, push2, len, nonce, push2, len, my pubkey
		// (we ineffectually push the recipient's pubkey to the stack just so the recipient's pubkey is in the script)
		const lock_script = [].concat([
			Hdlt_vm.OPCODE.OP_PUSH2,
			...Array.from(Hutil._int2Buf16(peer_b_pubkey.length)),
			...peer_b_pubkey, 
			Hdlt_vm.OPCODE.OP_PUSH2,
			...Array.from(Hutil._int2Buf16(sig.length)),
			...sig,
			Hdlt_vm.OPCODE.OP_PUSH2, 
			...Array.from(Hutil._int2Buf16(nonce.length)), 
			...nonce, 
			Hdlt_vm.OPCODE.OP_PUSH2, 
			...Array.from(Hutil._int2Buf16(peer_a_pubkey.length)), 
			...peer_a_pubkey
		]);

		tsact.lock = lock_script;
		return tsact;
	}

	send(tx) {
		if (!(tx instanceof Hdlt_tsact)) {
			return;
		}

    	this.dlt.tx_cache.set(Hdlt_tsact.sha256(Hdlt_tsact.serialize(tx)));
    	this.dlt.broadcast(this.dlt.tx_req, {hdlt_tsact: tx});
	}

	build_wot() {
		function _get_recip_pubkey(tx) {
			// The recpient's pubkey is the bytes specified by the 0th OP_PUSH2 instruction, which is the 0th byte of the script
			const recip_len = (tx.lock[1] << Happ_env.SYS_BYTE_WIDTH) | tx.lock[2];
			return tx.lock.slice(3, 3 + recip_len);
		}

		function _get_sender_pubkey(tx) {
			// If we 0-index the OP_PUSH2 instructions in the script, the signer's pubkey is the bytes specified by the 3rd one
			// Iteratively search the script starting from the front, striding over each push operand
			let idx = 0;
			let start = 0;
			let count = 0;
			
			while (count < 4) {
				idx = tx.lock.indexOf(Hdlt_vm.OPCODE.OP_PUSH2, idx + start);
				start = (tx.lock[idx + 1] << Happ_env.SYS_BYTE_WIDTH) | tx.lock[idx + 2];
				count += 1;
			}

			const signer_len = (tx.lock[idx + 1] << Happ_env.SYS_BYTE_WIDTH) | tx.lock[idx + 2];
			return tx.lock.slice(idx + 3, idx + 3 + signer_len);
		}

		// If there's an unresolved accidental fork, we arbitrarily select the 0th branch
		// TODO: this is almost definitely the wrong behavior
		const db = this.dlt.build_db(this.dlt.store.get_deepest_blocks()[0]);
		const wot = new Hgraph();

		Array.from(db.values()).forEach((tx) => {
			const recip = _get_recip_pubkey(tx);
			const sender = _get_sender_pubkey(tx);

			if (tx.utxo === Hksrv.SIG_TOK) {
				wot.add_edge(Buffer.from(sender).toString("hex"), Buffer.from(recip).toString("hex"));
			} else if (tx.utxo === Hksrv.REV_TOK) {
				wot.del_edge(Buffer.from(sender).toString("hex"), Buffer.from(recip).toString("hex"));
			}
		});

		return wot;
	}
}

module.exports.Hksrv = Hksrv;