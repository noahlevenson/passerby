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
  last_sent;

  constructor({slice, rinfo, tries = 0, last_sent = Number.NEGATIVE_INFINITY} = {}) {
    this.slice = slice;
    this.rinfo = rinfo;
    this.tries = tries;
    this.last_sent = last_sent;
  }
}

module.exports.Ftrans_udp_send_state = Ftrans_udp_send_state;