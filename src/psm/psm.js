"use strict";

const Codec = require("../protocol/codec.js");
const { Io } = require("../protocol/io.js")

/**
 * The PSM is our replicated state machine, living a layer above the raw storage medium. The
 * 'key' argument lets us multiplex a single state machine instead of creating multiple instances
 * of the state machine for each value in our database partition; each key essentially corresponds 
 * to a unique instance of the PSM.
 */ 

class Psm extends Io {
  constructor(bus, generator, read_f, write_f) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.PSM});
    this.write_f = write_f;
    this.read_f = read_f;
  }

  async goto_state(key, new_state, commit_msg) {
    return true;
  }

  async get_state(key) {
    return this.read_f(key);
  }
}

module.exports = { Psm };