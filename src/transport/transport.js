"use strict";

const EventEmitter = require("events");

class Transport {
  static TAG = "TRANSPORT";

  constructor() {
    this.recv = new EventEmitter();
  }

  send(msg, rinfo, msg_timeout) {
    throw new Error("Subclasses must implement send");
  }

  on_network() {
    throw new Error("Subclasses must implement on_network");
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