"use strict";

const { Transport, Rinfo } = require("../transport.js");

class Local extends Transport {
  constructor({pubstring, api, peer_map = new Map()} = {}) {
    super();
    this.pubstring = pubstring;
    this.peer_map = peer_map;
    this.peer_map.set(this.pubstring, api);
  }

  /**
   * rinfo must be an Rinfo object with an address field set to the pubstring of the recipient
   */ 
  async send(msg, rinfo, ttl) {
    const recip_api = this.peer_map.get(rinfo.address);

    if (!recip_api) {
      throw new Error(Transport.TAG, `Peer ${this.pubstring} could not find recipient ` + 
        `${recip_pubstring} in peer map`);
    }

    const my_rinfo = new Rinfo({address: this.pubstring, port: 31337, family: "local"});
    recip_api.transport.recv.emit("message", msg, my_rinfo);
  }

  on_network() {
    // Do nothing
  }
}

module.exports = { Local };