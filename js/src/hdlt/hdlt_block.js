/** 
* HDLT_BLOCK
* A block of DLT transactions
* 
* 
*
*
*/ 

"use strict";

const { Hid } = require("../hid/hid.js");
const { Hbintree } = require("../htypes/hbintree/hbintree.js");
const { Hdlt_tsact } = require("./hdlt_tsact.js");

// TODO: implement pruning of old transactions?
// Similar to Bitcoin, we don't actually serialize and store the 
// Merkle tree, so it's not possible to compact a block by
// stubbing off branches. In practice, Merkles ain't really doing
// anything for us yet, and are implemented only to support future functionality. 
// See:
// https://bitcoin.stackexchange.com/questions/2983/is-pruning-transaction-history-implemented-in-satoshis-bitcoin-client
// https://en.bitcoin.it/wiki/Block#Block_structure

class Hdlt_block {
	// TODO: move hash_prev, hash_merkle_root, and nonce to a Hdlt_block_hdr class?
	hash_prev;
	hash_merkle_root;
	nonce;
	tsacts;

	constructor ({hash_prev, hash_merkle_root, tsacts = []} = {}) {
		this.hash_prev = hash_prev;
		this.hash_merkle_root = hash_merkle_root;
		this.nonce = "00"; // Need two digits for Buffer to parse correctly
		this.tsacts = [...tsacts];
	}

	// Compute the SHA256 hash of a block
	static async sha256(block) {
		if (block.hash_prev === undefined || block.hash_merkle_root === undefined || block.nonce === undefined) {
			throw new Error("Debug warning - do not hash over undefined values!");
		}

		return await Hid.sha256(`${block.hash_prev}${block.hash_merkle_root}${block.nonce}`);
	}
}

module.exports.Hdlt_block = Hdlt_block;