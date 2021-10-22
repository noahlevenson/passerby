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
  msg_timeout;
  last_sent;

  constructor({slice, rinfo, tries = 0, msg_timeout, last_sent = Number.NEGATIVE_INFINITY} = {}) {
    this.slice = slice;
    this.rinfo = rinfo;
    this.tries = tries;
    this.msg_timeout = msg_timeout;
    this.last_sent = last_sent;
  }
}

module.exports.Ftrans_udp_send_state = Ftrans_udp_send_state;