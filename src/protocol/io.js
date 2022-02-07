"use strict";

const EventEmitter = require("events");
const Codec = require("./codec.js");

/**
 * Io is a bus interface. You can build network-I/O enabled modules by subclassing Io, passing in a 
 * reference to the message bus that the module should pub/sub to and a function to emit message
 * generation numbers. Io enables stateful communication; by passing a success and/or timeout 
 * callback to the 'send' method, you can specify work to be done upon message success or failure.
 */ 

class Io {
  static OUT = Symbol();
  static DEFAULT_TTL = 5000;

  constructor({bus, generator, type} = {}) {
    if (!Object.values(Codec.MSG_TYPE).includes(type)) {
      throw new RangeError("Invalid message type");
    }

    this.bus = bus;
    this.bus.on(type, this.on_message.bind(this));
    this.generator = generator;
    this.type = type;
    this.response = new EventEmitter();
  }

  on_message(gen, body, rinfo) {
    if (!Codec.is_gen_req(gen)) {
      this.response.emit(this._response_event_label(rinfo, gen));
    }
  }

  send({body, rinfo, gen, success = () => {}, timeout = () => {}, ttl = Io.DEFAULT_TTL}) {
    if (Codec.is_gen_req(gen)) {
      new Promise((resolve, reject) => {
        const label = this._response_event_label(rinfo, gen);

        const timeout_id = setTimeout(() => {
          this.response.removeAllListeners(label);
          reject(label);
        }, ttl);

        this.response.once(label, (msg) => {
          clearTimeout(timeout_id);
          success(msg);
          resolve(label);
        });
      }).catch((reason) => {
        timeout();
      });
    }

    this.bus.emit(Io.OUT, this.type, body, rinfo, gen, ttl);
  }

  _response_event_label(rinfo, gen) {
    return `${rinfo.pubstring}:${gen}`;
  }
}

module.exports = { Io };