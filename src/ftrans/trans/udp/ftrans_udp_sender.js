/** 
* FTRANS_UDP_SENDER
* Base class for a UDP sender
* Provides a common interface for iterating over
* and managing the unique state requirements of 
* disparate outgoing data types
* 
* 
*/ 

"use strict";

class Ftrans_udp_sender {
  constructor() {
  
  }

  add() {
    throw new Error("Subclasses must implement the add() method");
  }

  next() {
    throw new Error("Subclasses must implement the next() method");
  }

  length() {
    throw new Error("Subclasses must implement the length() method");
  }
}

module.exports.Ftrans_udp_sender = Ftrans_udp_sender;