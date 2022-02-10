"use strict";

const Codec = require("../protocol/codec.js");
const { Io } = require("../protocol/io.js")

/**
 * The PSM is our replicated state machine, living a layer above the raw storage medium. We multiplex 
 * the PSM via the notion of a key: Each execution of the state machine is parameterized first and 
 * foremost by a key, which enables us to manage the state of multiple data objects with a single 
 * instance of the state machine. Opcodes which require additional operands are detailed below.
 */ 

class Psm extends Io {
  static OPCODE = {
    READ: 0x10,
    WRITE: 0x20
  };

  /**
   * Operands structure:
   * 
   * READ:  []
   * WRITE: [val, commit_msg]
   */ 
  GRAMMAR = new Map([
    [Psm.OPCODE.READ, this._read],
    [Psm.OPCODE.WRITE, this._write]
  ]);

  constructor(bus, generator, read_f, write_f) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.PSM});
    this.write_f = write_f;
    this.read_f = read_f;
  }

  async exec(instruction) {
    const handler = this.GRAMMAR.get(instruction.opcode);

    // Bad opcode, silently discard this transaction
    if (!handler) {
      return;
    } 
    
    return handler.bind(this)(instruction.key, ...instruction.operands);
  }

  _read(key) {
    return this.read_f(key);
  }

  _write(key, val, commit_msg) {
    return this.write_f(key, val);
  }
}

function instruction({key, opcode, operands} = {}) {
  return {
    key: key,
    opcode: opcode,
    operands: operands
  };
}

module.exports = { Psm, instruction };