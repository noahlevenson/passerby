/** 
* FDLT_BLOCK
* A block of DLT transactions
* 
* 
*
*
*/ 

"use strict";

const { Fcrypto } = require("../fcrypto/fcrypto.js");
const { Fbintree } = require("../ftypes/fbintree/fbintree.js");
const { Fdlt_tsact } = require("./fdlt_tsact.js");

// TODO: implement pruning of old transactions? Similar to Bitcoin, we don't actually serialize 
// and store the Merkle tree, so it's not possible to compact a block by stubbing off branches. 
// In practice, Merkles ain't really doing anything for us yet, and are implemented only to support 
// future functionality. See: 
// https://bitcoin.stackexchange.com/questions/2983/is-pruning-transaction-history-implemented-in-satoshis-bitcoin-client
// https://en.bitcoin.it/wiki/Block#Block_structure

class Fdlt_block {
  hash_prev;
  hash_merkle_root;
  nonce;
  tsacts;

  constructor ({prev_block, tsacts = []} = {}) {
    this.hash_prev = Fdlt_block.sha256(prev_block);
    
    this.hash_merkle_root = Fbintree.build_merkle(tsacts.map(tx => 
      Fdlt_tsact.serialize(tx).toString("hex"))).get_root().get_data();

    // Need two digits for Buffer to parse correctly
    this.nonce = "00";
    this.tsacts = [...tsacts];
  }

  static sha256(block) {
    if (block.hash_prev === undefined || block.hash_merkle_root === undefined || 
      block.nonce === undefined) {
      throw new Error("Debug warning - do not hash over undefined values!");
    }

    return Fcrypto.sha256(`${block.hash_prev}${block.hash_merkle_root}${block.nonce}`);
  }
}

module.exports.Fdlt_block = Fdlt_block;