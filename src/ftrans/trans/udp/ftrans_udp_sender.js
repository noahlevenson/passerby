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

  // This should enqueue a data item
  add() {
    throw new Error("Subclasses must implement the add() method");
  }

  // This should return the length of the queue
  length() {
    throw new Error("Subclasses must implement the length() method");
  }

  // If length() > 0, this should dequeue a data item in O(1) in all cases
  next() {
    throw new Error("Subclasses must implement the next() method");
  }
}

module.exports.Ftrans_udp_sender = Ftrans_udp_sender;