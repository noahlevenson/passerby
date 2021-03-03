/** 
* HDLT_BLOCK
* A block of DLT transactions
* 
* 
*
*
*/ 

"use strict";

const { Hutil } = require("../hutil/hutil.js");
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

	constructor ({prev_block, tsacts = []} = {}) {
		this.hash_prev = Hdlt_block.sha256(prev_block);
		this.hash_merkle_root = Hbintree.build_merkle(tsacts.map(tx => Hdlt_tsact.serialize(tx).toString("hex"))).get_root().get_data();
		this.nonce = "00"; // Need two digits for Buffer to parse correctly
		this.tsacts = [...tsacts];
	}

	// Compute the SHA256 hash of a block
	static sha256(block) {
		return Hutil._sha256(`${block.hash_prev}${block.hash_merkle_root}${block.nonce}`);
	}
}

module.exports.Hdlt_block = Hdlt_block;