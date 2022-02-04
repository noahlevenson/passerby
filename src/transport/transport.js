"use strict";

const EventEmitter = require("events");

class Transport {
  static TAG = "TRANSPORT";

  constructor() {
    this.recv = new EventEmitter();
  }

  _send(msg, rinfo) {
    throw new Error("Subclasses must implement _send");
  }

  _on_network() {
    throw new Error("Subclasses must implement _on_network");
  }
}

module.exports = { Transport };