/** 
* FKSRV
* Distributed ledger-based keyserver
* for web-of-trust-ish system of peer-signed
* certificates
*
*
*/

"use strict";

const { Fapp_env } = require("../fapp/fapp_env.js");
const { Fid } = require("../fid/fid.js");
const { Fdlt } = require("../fdlt/fdlt.js");
const { Fdlt_net_solo } = require("../fdlt/net/fdlt_net_solo.js");
const { Fdlt_tsact } = require("../fdlt/fdlt_tsact.js");
const { Fdlt_vm } = require("../fdlt/fdlt_vm.js");
const { Fdlt_block } = require("../fdlt/fdlt_block.js");
const { Fgraph } = require("../ftypes/fgraph/fgraph.js"); 
const { Flog } = require("../flog/flog.js");
const { Futil } = require("../futil/futil.js");

// The keyserver is an application layer built atop FDLT which provides a distributed database 
// of public keys and a record of relationships between keys in the form of signatures and revocations:
// A peer signs another peer's key by spending a persistent token, SIG_TOK. A peer revokes his signature
// from another peer by spending a persistent token, REV_TOK. Peers may double spend SIG_TOK and REV_TOK,
// we interpret transactions idempotently. A peer registers his new key with the keyserver by signing
// his own key. Peers may not revoke their self-signature. Anytime a peer spends SIG_TOK or REV_TOK,
// they must present a signature for proof of identity and a valid proof of work for their identity,
// which is enforced with SCRIPT_IS_VALID_SIG_AND_POW.

class Fksrv {
	static REQ_POW_BITS = Fid.POW_LEAD_ZERO_BITS;
	static SIG_TOK = Buffer.from([0xDE, 0xAD]).toString("hex");
	static REV_TOK = Buffer.from([0xBE, 0xEF]).toString("hex");
	static SCRIPT_NO_UNLOCK = [Fdlt_vm.OPCODE.OP_PUSH1, 0x01, 0x00];
	static SCRIPT_IS_VALID_SIG_AND_POW = [Fdlt_vm.OPCODE.OP_CHECKSIGPOW, Fksrv.REQ_POW_BITS];

	static SIG_TX = new Fdlt_tsact({
		utxo: Fksrv.SIG_TOK.split("").reverse().join(""), 
		lock: [Fdlt_vm.OPCODE.OP_NOOP], 
		unlock: Fksrv.SCRIPT_IS_VALID_SIG_AND_POW,
		t: 31337
	});

	static REV_TX = new Fdlt_tsact({
		utxo: Fksrv.REV_TOK.split("").reverse().join(""),
		lock: [Fdlt_vm.OPCODE.OP_NOOP],
		unlock: Fksrv.SCRIPT_IS_VALID_SIG_AND_POW,
		t: 31337
	})

	// The application layer tx validation hook is where you specify any special validation logic for 
	// transactions beyond what's applied by the Fdlt layer - should return true if valid, false if not
	static TX_VALID_HOOK(tx_new, utxo_db) {
		// TODO: make sure that tx_new only has the scripts it's allowed to have
		// TODO: make sure that tx_new is not a self-spend of REV_TOK - though we might instead enforce that in the unlock script for REV_TOK
		return true;
	};

	// The application layer UTXO DB hook is is expected to modify a utxo db Map as necessary when
	// accepting a new valid transaction, including any special logic that's unique to this 
	// application (the default behavior would be just to set tx_new)
	static UTXO_DB_HOOK(tx_new, utxo_db) {
		utxo_db.set(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx_new)), tx_new);
		return utxo_db;
	}

	// The application layer UTXO DB init hook is for anything special you want to do to
	// a utxo db Map at initialization time, before computing the state of the db
	// this is called in Fdlt.build_db
	static UTXO_DB_INIT_HOOK(utxo_db) {
		// Here we just set our persistent signature and revocation token
		utxo_db.set(Fksrv.SIG_TOK, Fksrv.SIG_TX);
		utxo_db.set(Fksrv.REV_TOK, Fksrv.REV_TX);
		return utxo_db;
	}

	// TODO: We should implement an Fdlt "application layer" base class to accommodate the above hooks
	// and other contracts and Fksrv should subclass it
	
	dlt;
	
	constructor ({dlt} = {}) {
		this.dlt = dlt;
	}

	start() {
		this.dlt.start();
		Flog.log(`[FKSRV] (${this.dlt.net.app_id}) Online`);
	}

	stop() {
		this.dlt.stop();
		Flog.log(`[FKSRV] (${this.dlt.net.app_id}) Offline`);
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
		const tsact = new Fdlt_tsact({
			utxo: Fksrv.SIG_TOK,
			lock: [],
			unlock: Fksrv.SCRIPT_NO_UNLOCK
		});	

		const privkey = await Fid.get_privkey();
		const sig = await Fid.sign(Fdlt_vm.make_sig_preimage(Fksrv.SIG_TX, tsact), Buffer.from(privkey, "hex"));

		// lock script: push2, len, recip pubkey, push2, len, sig, push2, len, nonce, push2, len, my pubkey
		// (we ineffectually push the recipient's pubkey to the stack just so the recipient's pubkey is in the script)
		const lock_script = [].concat([
			Fdlt_vm.OPCODE.OP_PUSH2,
			...Array.from(Futil._int2Buf16(peer_b_pubkey.length)),
			...peer_b_pubkey, 
			Fdlt_vm.OPCODE.OP_PUSH2,
			...Array.from(Futil._int2Buf16(sig.length)),
			...sig,
			Fdlt_vm.OPCODE.OP_PUSH2, 
			...Array.from(Futil._int2Buf16(nonce.length)), 
			...nonce, 
			Fdlt_vm.OPCODE.OP_PUSH2, 
			...Array.from(Futil._int2Buf16(peer_a_pubkey.length)), 
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
		const tsact = new Fdlt_tsact({
			utxo: Fksrv.REV_TOK,
			lock: [],
			unlock: Fksrv.SCRIPT_NO_UNLOCK
		});

		const privkey = await Fid.get_privkey();
		const sig = await Fid.sign(Fdlt_vm.make_sig_preimage(Fksrv.REV_TX, tsact), Buffer.from(privkey, "hex"));

		// lock script: push2, len, recip pubkey, push2, len, sig, push2, len, nonce, push2, len, my pubkey
		// (we ineffectually push the recipient's pubkey to the stack just so the recipient's pubkey is in the script)
		const lock_script = [].concat([
			Fdlt_vm.OPCODE.OP_PUSH2,
			...Array.from(Futil._int2Buf16(peer_b_pubkey.length)),
			...peer_b_pubkey, 
			Fdlt_vm.OPCODE.OP_PUSH2,
			...Array.from(Futil._int2Buf16(sig.length)),
			...sig,
			Fdlt_vm.OPCODE.OP_PUSH2, 
			...Array.from(Futil._int2Buf16(nonce.length)), 
			...nonce, 
			Fdlt_vm.OPCODE.OP_PUSH2, 
			...Array.from(Futil._int2Buf16(peer_a_pubkey.length)), 
			...peer_a_pubkey
		]);

		tsact.lock = lock_script;
		return tsact;
	}

	send(tx) {
		if (!(tx instanceof Fdlt_tsact)) {
			return;
		}

    	this.dlt.tx_cache.set(Fdlt_tsact.sha256(Fdlt_tsact.serialize(tx)));
    	this.dlt.broadcast(this.dlt.tx_req, {fdlt_tsact: tx});
	}

	build_wot() {
		function _get_recip_pubkey(tx) {
			// The recpient's pubkey is the bytes specified by the 0th OP_PUSH2 instruction, which is the 0th byte of the script
			const recip_len = (tx.lock[1] << Fapp_env.SYS_BYTE_WIDTH) | tx.lock[2];
			return tx.lock.slice(3, 3 + recip_len);
		}

		function _get_sender_pubkey(tx) {
			// If we 0-index the OP_PUSH2 instructions in the script, the signer's pubkey is the bytes specified by the 3rd one
			// Iteratively search the script starting from the front, striding over each push operand
			let idx = 0;
			let start = 0;
			let count = 0;
			
			while (count < 4) {
				idx = tx.lock.indexOf(Fdlt_vm.OPCODE.OP_PUSH2, idx + start);
				start = (tx.lock[idx + 1] << Fapp_env.SYS_BYTE_WIDTH) | tx.lock[idx + 2];
				count += 1;
			}

			const signer_len = (tx.lock[idx + 1] << Fapp_env.SYS_BYTE_WIDTH) | tx.lock[idx + 2];
			return tx.lock.slice(idx + 3, idx + 3 + signer_len);
		}

		// If there's an unresolved accidental fork, we arbitrarily select the 0th branch
		// TODO: this is almost definitely the wrong behavior
		const db = this.dlt.build_db(this.dlt.store.get_deepest_blocks()[0]);
		const wot = new Fgraph();

		Array.from(db.values()).forEach((tx) => {
			const recip = _get_recip_pubkey(tx);
			const sender = _get_sender_pubkey(tx);

			if (tx.utxo === Fksrv.SIG_TOK) {
				wot.add_edge(Buffer.from(sender).toString("hex"), Buffer.from(recip).toString("hex"));
			} else if (tx.utxo === Fksrv.REV_TOK) {
				wot.del_edge(Buffer.from(sender).toString("hex"), Buffer.from(recip).toString("hex"));
			}
		});

		return wot;
	}
}

module.exports.Fksrv = Fksrv;