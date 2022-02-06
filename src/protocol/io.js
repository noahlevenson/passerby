"use strict";

const Codec = require("./codec.js");

/**
 * Io is a bus interface; you build network-I/O enabled modules by subclassing Io, passing in a 
 * reference to the message bus that the module should pub/sub to.
 */ 

class Io {
  static OUT = Symbol();
  static DEFAULT_TTL = 5000;

  constructor({bus, type, is_stateful = false} = {}) {
    if (!Object.values(Codec.MSG_TYPE).includes(type)) {
      throw new RangeError("Invalid message type");
    }

    this.bus = bus;
    this.bus.on(type, this.on_message.bind(this));
    this.type = type;
    this.is_stateful = is_stateful;
    this.res = is_stateful ? new EventEmitter() : null;
  }

  on_message(msg_id, body) {
    if (this.is_stateful) {
      // Check if the message is a response; if so, emit it on res, otherwise do something else
    }
  }

  send({body, rinfo, msg_id, success = () => {}, timeout = () => {}, ttl = Io.DEFAULT_TTL}) {
    if (this.is_stateful) {
      // Set up the listener on res, start the ttl timer
    }

    this.bus.emit(Io.OUT, this.type, body, rinfo, msg_id, ttl);
  }
}

module.exports = { Io };