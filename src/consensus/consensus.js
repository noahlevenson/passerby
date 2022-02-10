"use strict";

const Codec = require("../protocol/codec.js");
const { Io } = require("../protocol/io.js");
const { MSG_TYPE, message, request_data } = require("./message.js");
 
class Pbft extends Io {
  constructor(bus, generator, repman, psm) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.CONSENSUS});
    this.repman = repman;
    this.psm = psm;
  }

  /**
   * Request execution of a state machine operation for a given key. For details about the format of
   * Psm instruction objects, supported opcodes, and operand structure, refer to the PSM docs.
   */ 
  async exec(instruction) {
    const r = await this.repman.fetch_r(instruction.key);
    const primary = this._get_p(0, r); // TODO: note the placeholder view number 0 here
    const msg = message({type: MSG_TYPE.REQUEST, data: request_data({o: instruction})});

    this.send({
      body: msg,
      body_type: Codec.BODY_TYPE.JSON,
      rinfo: primary,
      gen: this.generator()
    });
  }

  _get_p(v, r) {
    return r[v % r.length];
  }

  on_message(gen, body, rinfo) {
    // TODO: Actually handle the msg and do PBFT... for now, we just execute operation requests locally

    if (body.type === MSG_TYPE.REQUEST) {
      this.psm.exec(body.data.o);
    }
  }
}

module.exports = { Pbft };