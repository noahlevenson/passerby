/** 
* FTRANS_UDP_SOCKETABLE
* Encapsulates data to be sent to a socket 
* 
* 
* 
* 
*/ 

"use strict";

class Ftrans_udp_socketable {
  buf;
  address;
  port;

  constructor({buf, address, port} = {}) {
    this.buf = buf;
    this.address = address;
    this.port = port;
  }
}

module.exports.Ftrans_udp_socketable = Ftrans_udp_socketable;