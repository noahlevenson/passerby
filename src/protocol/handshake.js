"use strict";

const { Io } = require("./io.js");
const { Rinfo } = require("../transport/transport.js");
const Codec = require("./codec.js");
const Journal = require("../core/journal.js");

class Handshake extends Io {
  static TAG = "HAND";

  constructor(bus, generator) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.HANDSHAKE});
  }

  async begin(rinfo) {
    Journal.log(Handshake.TAG, `Handshake begin -> ${rinfo.address}:${rinfo.port}`);

    this.send({
      body: "HELLO",
      body_type: Codec.BODY_TYPE.JSON,
      rinfo: rinfo,
      gen: this.generator(),
      success: (gen, body) => {
        Journal.log(Handshake.TAG, `Handshake OK <- ${rinfo.address}:${rinfo.port}`);
      },
      timeout: () => {
        console.log(Handshake.TAG, `Handshake FAILED ${rinfo.address}:${rinfo.port}`);
      }
    });

    return "DEBUG SESSION KEY";
  }

  on_message(gen, body, rinfo) {
    super.on_message(gen, body, rinfo);
    // TODO: Implement the handshake state machine! 
    // For now the handshake is just a sender hello and a receiver hello

    if (Codec.is_gen_req(gen)) {
      this.send({
        body: "HELLO",
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: new Rinfo({address: msg.from.addr, port: msg.from.port}),
        gen: Codec.get_gen_res(gen),
        ttl: Kademlia.DEFAULT_TTL
      });
    }
  }
}

module.exports = { Handshake };