/** 
* FTRANS_UDP_SEND_STATE
* Encapsulates state for an outbound slice
* 
* 
* 
* 
*/ 

"use strict";

class Ftrans_udp_send_state {
  slice;
  rinfo;
  tries;

  constructor({slice, rinfo, tries = 0} = {}) {
    this.slice = slice;
    this.rinfo = rinfo;
    this.tries = tries;
  }
}

module.exports.Ftrans_udp_send_state = Ftrans_udp_send_state;