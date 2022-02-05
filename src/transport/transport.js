"use strict";

const EventEmitter = require("events");

class Transport {
  static TAG = "TRANSPORT";

  constructor() {
    this.recv = new EventEmitter();
  }

  _send(msg, rinfo, msg_timeout) {
    throw new Error("Subclasses must implement _send");
  }

  _on_network() {
    throw new Error("Subclasses must implement _on_network");
  }
}

class Rinfo {
  constructor({address, port, family} = {}) {
    this.address = address;
    this.port = port;
    this.family = family;
  }
}

module.exports = { Transport, Rinfo };