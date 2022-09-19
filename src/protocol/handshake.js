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

  /**
   * TODO: Implement the handshake state machine! For now the handshake is just a client/server hello
   */ 
  begin(rinfo) {
    return new Promise((resolve, reject) => {
      Journal.log(Handshake.TAG, `Handshake begin -> ${rinfo.address}:${rinfo.port}`);

      this.send({
        body: "HELLO",
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: rinfo,
        gen: this.generator(),
        success: (gen, body) => {
          const key = "DEBUG SESSION KEY";
          Journal.log(Handshake.TAG, `Handshake OK <- ${rinfo.address}:${rinfo.port} [${key}]`);
          resolve(key);
        },
        timeout: () => {
          console.log(Handshake.TAG, `Handshake FAILED ${rinfo.address}:${rinfo.port}`);
          resolve(undefined);
        }
      });
    });
  }

  on_message(gen, body, rinfo) {
    super.on_message(gen, body, rinfo);

    if (Codec.is_gen_req(gen)) {
      this.send({
        body: "HELLO",
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: rinfo,
        gen: Codec.get_gen_res(gen)
      });
    }
  }
}

module.exports = { Handshake };