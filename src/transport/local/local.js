"use strict";

const { Transport, Rinfo } = require("../transport.js");

/**
 * Local is a transport for performing local network emulation. Pass my_addr as a unique string 
 * (e.g. a pubstring) to identify this peer in the network. my_port can be an arbitrary non-unique 
 * number. The first peer to be spawned in the emulated network should not be passed a peer_map; 
 * each subsequently spawned peer should be passed a reference to the first peer's peer_map. You 
 * should pass my_addr and my_port to Passerby.start as described in the protocol documentation.
 * Callback send_cb(from, to, msg) is called each time a message is sent over the transport. Using
 * send_cb, you can intercept each peer's outbound messages -- to provide, for example, a global 
 * view of the systemwide network traffic.
 */ 

class Local extends Transport {
  constructor({my_addr, my_port = 31337, peer_map = new Map(), send_cb = () => {}} = {}) {
    super();
    this.my_addr = my_addr;
    this.my_port = my_port;
    this.peer_map = peer_map;
    this.peer_map.set(this.my_addr, this);
    this.send_cb = send_cb;
  }

  /**
   * rinfo must be an Rinfo object with an address field set to the pubstring of the recipient
   */ 
  async send(msg, rinfo, ttl) {
    const recip_transport = this.peer_map.get(rinfo.address);

    if (!recip_transport) {
      throw new Error(Transport.TAG, `Peer ${this.pubstring} could not find recipient ` + 
        `${recip_pubstring} in peer map`);
    }

    const my_rinfo = new Rinfo({address: this.my_addr, port: this.my_port, family: "local"});
    recip_transport.recv.emit("message", msg, my_rinfo);
    this.send_cb(this.my_addr, rinfo.address, msg);
  }

  on_network() {
    // Do nothing
  }
}

module.exports = { Local };