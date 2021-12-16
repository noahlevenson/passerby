/** 
* FTRANS_SIM
* Simulation transport - run a simulated 
* network on a single host machine
* 
* 
* 
*/ 

"use strict";

const { Ftrans } = require("../ftrans.js");
const { Ftrans_msg } = require("../../ftrans_msg.js");
const { Ftrans_rinfo } = require("../../ftrans_rinfo.js");

class Ftrans_sim extends Ftrans {
  pubkey;
  peer_map;
  
  constructor({pubkey = null, fapp = null, peer_map = new Map()} = {}) {
    super();
    this.pubkey = pubkey;
    this.peer_map = peer_map;
    this.peer_map.set(this.pubkey, fapp);
  }

  async _on_network(msg, rinfo) {
    // Do nothing
  }

  async start() {
    // Do nothing
  }

  async _send(msg, msg_type, ftrans_rinfo, msg_timeout) {
    const ftrans_msg = new Ftrans_msg({
      msg: msg,
      type: msg_type,
      sender_pubkey: this.pubkey,
      recip_pubkey: ftrans_rinfo.pubkey
    });

    const recip_fapp = this.peer_map.get(ftrans_rinfo.pubkey);

    if (!recip_fapp) {
      throw new Error(`[FTRANS] Peer ${this.pubkey} could not find recipient in peer map: ` + 
        `${ftrans_rinfo.pubkey}`);
    }

    const my_rinfo = new Ftrans_rinfo({
      address: null,
      port: null,
      family: null,
      pubkey: this.pubkey
    });

    recip_fapp.trans.network.emit("message", ftrans_msg, my_rinfo);
  }
}

module.exports.Ftrans_sim = Ftrans_sim;