"use strict";

const { Io } = require("../protocol/io.js");
const Codec = require("../protocol/codec.js");
const Journal = require("../core/journal.js");

class Handshake extends Io {
  static TAG = "HAND";

  constructor(bus) {
    super({bus: bus, type: Codec.MSG_TYPE.HANDSHAKE});
  }

  async begin(rinfo) {
    Journal.log(Handshake.TAG, `Handshake begin: ${rinfo.pubstring}`);
    Journal.log(Handshake.TAG, `Handshake OK, channel secure: ${rinfo.pubstring}`);
    return "DEBUG SESSION KEY";
  }

  on_message(msg_id, body) {
    super.on_message(msg_id, body);
    // TODO: Handle inbound handshake request
  }
}

module.exports = { Handshake };