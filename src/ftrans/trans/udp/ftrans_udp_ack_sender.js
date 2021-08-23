/** 
* FTRANS_UDP_ACK_SENDER
* Implements the Ftrans_udp_sender interface
* over an outbound ack buffer
* 
* 
* 
* 
*/ 

"use strict";

const { Ftrans_udp_sender } = require("./ftrans_udp_sender.js");
const { Ftrans_udp_socketable } = require("./ftrans_udp_socketable.js");

class Ftrans_udp_ack_sender extends Ftrans_udp_sender {
  // At capacity, we just stop enqueueing acks; it's not as fancy as a ring buffer, but it's lightweight
  static MAX_OUTBOUND_ACKS = 8192;

  ack_send_buf;
 
  constructor() {
    super();
    this.ack_send_buf = [];
  }

  add({ack, rinfo} = {}) {
    if (this.ack_send_buf.length < Ftrans_udp_ack_sender.MAX_OUTBOUND_ACKS) {
      this.ack_send_buf.push([ack, rinfo]);
    }
  }

  next() {
    if (this.ack_send_buf.length > 0) {
      const [ack, rinfo] = this.ack_send_buf.shift();

      return new Ftrans_udp_socketable({
        buf: ack,
        address: rinfo.address,
        port: rinfo.port
      });
    }

    return null;
  }

  length() {
    return this.ack_send_buf.length;
  }
}

module.exports.Ftrans_udp_ack_sender = Ftrans_udp_ack_sender;