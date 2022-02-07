"use strict";

const { Io } = require("../protocol/io.js");
const Codec = require("../protocol/codec.js");
const Journal = require("../core/journal.js");

class Handshake extends Io {
  static TAG = "HAND";

  constructor(bus, generator) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.HANDSHAKE});
  }

  async begin(rinfo) {
    Journal.log(Handshake.TAG, `Handshake begin: ${rinfo.pubstring}`);
    Journal.log(Handshake.TAG, `Handshake OK, channel secure: ${rinfo.pubstring}`);
    return "DEBUG SESSION KEY";
  }

  on_message(gen, body, rinfo) {
    super.on_message(gen, body, rinfo);
    // TODO: Handle inbound handshake request
  }
}

module.exports = { Handshake };