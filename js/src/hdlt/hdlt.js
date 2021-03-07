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
const { Hntree } = require("../htypes/hntree/hntree.js");
const { Hntree_node } = require("../htypes/hntree/hntree_node.js");
const { Hdlt_block } = require("./hdlt_block.js");

// HDLT only concerns itself with the technical functionality of a DLT:
// blocks, transactions, validation, the VM, messaging, and consensus
// It doesn't concern itself with interpreting a blockchain or any notion
// of state (e.g. unspent outputs or a utxo db) - that stuff is the
// responsibility of the application layer

class Hdlt {
	static GENESIS = {
		hash_prev: 0x00,
		hash_merkle_root: 0x00,
		nonce: "00",
		tsacts: []
	};

	static CONSENSUS_METHOD = {
		AUTH: 1 // When using AUTH, pass a list of pubkeys for authorities as args
	};

	NONCE_INTEGRITY = new Map([
		[Hdlt.CONSENSUS_METHOD.AUTH, this._verify_nonce_auth]
	]);

	consensus;
	args;
	blocks;
	app_id;

	constructor ({consensus = Hdlt.CONSENSUS_METHOD.AUTH, args = [], blocks = new Hntree(new Hntree_node({data: Hdlt.GENESIS})), app_id} = {}) {
		if (!app_id) {
			throw new Error("app_id must be a string");
		}

		this.consensus = consensus;
		this.args = args;
		this.blocks = blocks;
		this.app_id = app_id;
	}

	// For AUTH consensus, the nonce must be a signature over the hash of of a copy of the block
	// where block.nonce is replaced with the signer's public key
	static make_nonce_auth(block, pubkey, privkey) {
		const data = Buffer.from(Hdlt_block.sha256(Object.assign(block, {nonce: pubkey})), "hex");
		return Happ.sign(data, privkey).toString("hex");
	}

	// Get the tree nodes corresponding to the deepest blocks in the tree
	// in a tree where there is one longest branch, this will return one node
	get_deepest_blocks() {
		const pg = this.blocks.bfs((node, d, data) => {
			data.push([node, d]);
		});

		const max_d = Math.max(...pg.map(pair => pair[1]));
		return pg.filter(pair => pair[1] === max_d).map(pair => pair[0]);
	}

	// Determine the integrity of a block in a node in our tree
	// Integrity is two checks: the block's hash_prev must match the hash
	// of the previous block, and its nonce must pass the integrity check
	// prescribed by the consensus method associated with this instance of HDLT
	is_valid_block(node) {
		const hash_check = Hdlt_block.sha256(node.parent.data) === node.data.hash_prev;
		const nonce_check = this.verify_nonce(node.data);

		if (hash_check && nonce_check) {
			return true;
		}

		return false;
	}

	verify_nonce(block) {
		return this.NONCE_INTEGRITY.get(this.consensus).bind(this)(block);
	}

	// TODO: this is linear search through the pubkeys in args :(
	_verify_nonce_auth(block) {
		return this.args.some((arg) => {
			const data = Buffer.from(Hdlt_block.sha256(Object.assign({}, block, {nonce: arg})), "hex");
			return Happ.verify(data, Buffer.from(arg, "hex"), Buffer.from(block.nonce, "hex"));
		});
	}
}

module.exports.Hdlt = Hdlt;