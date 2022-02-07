"use strict";

const { Io } = require("./io.js");
const Codec = require("./codec.js");
const Journal = require("../core/journal.js");

class Handshake extends Io {
  static TAG = "HAND";

  constructor(bus, generator) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.HANDSHAKE});
  }

  async begin(rinfo) {
    Journal.log(Handshake.TAG, `Handshake begin -> ${rinfo.address}:${rinfo.port}`);
    Journal.log(Handshake.TAG, `Handshake OK <- ${rinfo.address}:${rinfo.port}`);
    return "DEBUG SESSION KEY";
  }

  on_message(gen, body, rinfo) {
    super.on_message(gen, body, rinfo);
    // TODO: Handle inbound handshake request
  }
}

module.exports = { Handshake };