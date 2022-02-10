"use strict";

const { Rinfo } = require("../transport/transport.js");

class Repman {
  constructor(node_lookup_f) {
    this.node_lookup_f = node_lookup_f;
  }

  async fetch_r(key) {
    const node_list = await this.node_lookup_f(key);
    return node_list.payload.map(node_info => new Rinfo({address: node_info.addr, port: node_info.port}))
  }
}

module.exports = { Repman };