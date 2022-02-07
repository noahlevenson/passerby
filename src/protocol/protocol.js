"use strict";

const EventEmitter = require("events");
const Codec = require("./codec.js");
const { Io } = require("./io.js");
const { Handshake } = require("./handshake.js");
const Journal = require("../core/journal.js");

/**
 * This implementation is based on a message bus pattern. The message bus is essentially a broker 
 * between the transport and all the higher level modules; it's the single home for all messages in
 * their intermediate representations. All encryption, decryption, encoding, and decoding happens
 * here at the protocol layer: We decode inbound messages from the transport and announce them on 
 * the bus, and we encode outbound messages from the bus and send them to the transport.
 */ 

class Passerby {
  static TAG = "PSBY";
  static V = "0.0.0";

  constructor({transport} = {}) {
    this.transport = transport;
    this.transport.recv.on("message", this._inbound.bind(this));
    this.bus = new EventEmitter();
    this.bus.on(Io.OUT, this._outbound.bind(this));
    this.sessions = new Map();
    this._generation = 0;
    this.handshake = new Handshake(this.bus, this.generate_id.bind(this));
  }

  /**
   * Boot this instance of the Passerby protocol
   */ 
  async start() {
    Journal.log(Passerby.TAG, `Welcome to Passerby v${Passerby.V}`);
    await this.transport.start();
  }

  /**
   * Disconnect from the network and stop this instance of the Passerby protocol
   */ 
  async stop() {
    await this.transport.stop();
  }

  /**
   * We increment our message counter each time we send a message, and wrap it according to the 
   * byte width of the generation field specified in the codec
   */
  generate_id() {
    this._generation = this._generation < Codec.GEN_MAX ? this._generation + 1 : Codec.GEN_MIN;
    return this._generation;
  }

  /**
   * Send a message to a remote peer over a secure channel; if a secure channel has not yet been
   * established, we'll execute the handshake protocol first
   */ 
  async send_secure({type = Codec.MSG_TYPE.APPLICATION, body, rinfo, gen, ttl} = {}) {
    const session_key = this.sessions.get(JSON.stringify(rinfo));

    if (!session_key) {
      this.sessions.set(JSON.stringify(rinfo), await this.handshake.begin(rinfo));
    }

    const encoded = Codec.encode({
      body: body, 
      type: type, 
      gen: gen,
      session_key: session_key
    });

    this.transport.send(encoded, rinfo, ttl);
  }

  /**
   * This handler is invoked when the transport receiver announces some inbound data from the
   * network (we must decode it, decrypt it, and announce it on the message bus)
   */ 
  _inbound(msg, rinfo) {
    const decoded = Codec.decode(msg);

    if (decoded !== null) {
      console.log(decoded);

      this.bus.emit(decoded.header.type, decoded.header.gen, decoded.body, rinfo);
    }
  }

  /**
   * This handler is invoked when a higher level module announces an outbound message on the message
   * bus (we must encode it, encrypt it, and send it to the transport)
   */ 
  _outbound(type, body, rinfo, gen, ttl) {
    this.send_secure({type: type, body: body, rinfo: rinfo, gen: gen, ttl: ttl});
  }  
}

module.exports = { Passerby };