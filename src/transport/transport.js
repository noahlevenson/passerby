"use strict";

const EventEmitter = require("events");

class Transport {
  static TAG = "TSPT";

  constructor() {
    this.recv = new EventEmitter();
  }

  send(msg, rinfo, ttl) {
    throw new Error("Subclasses must implement send");
  }

  on_network() {
    throw new Error("Subclasses must implement on_network");
  }
}

class Rinfo {
  constructor({address, port, family, pubstring} = {}) {
    this.address = address;
    this.port = port;
    this.family = family;
    this.pubstring = pubstring;
  }
}

module.exports = { Transport, Rinfo };