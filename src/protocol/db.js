"use strict";

const { Psm, instruction } = require("../psm/psm.js");
const Journal = require("../core/journal.js");

/**
 * Db is the public API for the distributed database, combining consensus, the replicated state 
 * machine, and the DHT. It exists to decouple the database interface from the protocol, because 
 * otherwise we'd have a circular dependency: Data flows from the protocol to the PHT, but the PHT 
 * circularly relies on the high level database API to perform reads and writes.
 */ 

class Db {
  static TAG = "DBAS";

  constructor(consensus) {
    this.consensus = consensus;
  }

  async read(key) {
    Journal.log(Db.TAG, `READ ${key.to_hex_str()}`);
    return this.consensus.request(instruction({key: key, opcode: Psm.OPCODE.READ}));
  }

  async write(key, val) {
    Journal.log(Db.TAG, `WRITE ${key.to_hex_str()}`);
    return this.consensus.request(instruction({key: key, opcode: Psm.OPCODE.WRITE, operands: [val]}));
  }
}

module.exports = { Db };