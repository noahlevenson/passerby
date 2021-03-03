/** 
* HDLT
* A generalized distributed ledger, built atop a
* stack-based virtual machine, for managing arbitrary
* contracts
*
*
*/ 

"use strict";

const { Happ } = require("../happ/happ.js");
const { Hdlt_block } = require("./hdlt_block.js");

// HDLT only concerns itself with the technical functionality of a DLT:
// blocks, transactions, validation, the VM, messaging, and consensus
// It doesn't concern itself with interpreting a blockchain or any notion
// of state (e.g. unspent outputs or a utxo db) - that stuff is the
// responsibility of the application layer

class Hdlt {
	static CONSENSUS_METHOD = {
		AUTH: 1 // When using AUTH, pass a list of pubkeys for authorities as args
	};

	NONCE_INTEGRITY = new Map([
		[Hdlt.CONSENSUS_METHOD.AUTH, _nonce_auth]
	]);

	consensus;
	args;
	blocks;

	constructor ({consensus = Hdlt.CONSENSUS_METHOD.AUTH, args = [], blocks = []} = {}) {
		this.consensus = consensus;
		this.args = args;
		this.blocks = blocks;
	}

	// Determine the integrity of a block in our array
	// Integrity is two checks: the block's hash_prev must match the hash
	// of the previous block, and its nonce must pass the integrity check
	// prescribed by this HDLT instance's consensus method
	is_valid_block(idx = 1) {
		const hash_check = Hdlt_block.sha256(this.blocks[idx - 1]) === this.blocks[idx].hash_prev;
		const nonce_check = this.NONCE_INTEGRITY.get(this.consensus).bind(this)(block);

		if (hash_check && nonce_check) {
			return true;
		}

		return false;
	}

	// For proof of authority, the nonce must be a signature over the hash of the block
	// provided by one of the authorities listed in args
	_nonce_auth(block) {
		// TODO: this is linear search through the pubkeys in args :(
		return this.args.some(arg => Happ.verify(Hdlt_block.sha256(block), Buffer.from(arg, "hex"), block.nonce));
	}
}

module.exports.Hdlt = Hdlt;