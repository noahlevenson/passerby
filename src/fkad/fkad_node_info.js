/** 
* FKAD_NODE_INFO
* Contact info for a peer
*
*
*
*
*/ 

"use strict";

const { Fcrypto } = require("../fcrypto/fcrypto.js");

class Fkad_node_info {
  addr;
  port;
  node_id;
  pubkey;

  constructor({addr = null, port = null, node_id = null, pubkey = null} = {}) {
    this.addr = addr;
    this.port = port;
    this.node_id = node_id;
    this.pubkey = pubkey;
  }

  static compare(info_a, info_b) {
    return info_a.addr === info_b.addr && info_a.port === info_b.port && 
      info_a.node_id.equals(info_b.node_id) && Fcrypto.sha1(info_a.pubkey) === Fcrypto.sha1(info_b.pubkey);
  }
}

module.exports.Fkad_node_info = Fkad_node_info;