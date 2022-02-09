"use strict";

const EventEmitter = require("events");
const Codec = require("./codec.js");
const { Rinfo } = require("../transport/transport.js");
const { Io } = require("./io.js");
const { Handshake } = require("./handshake.js");
const { Whoami } = require("../whoami/whoami.js");
const { Kademlia } = require("../dht/dht.js");
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
    this.whoami = new Whoami(this.bus, this.generate_id.bind(this));
    this.dht = null;
  }

  /**
   * Boot this instance of the Passerby protocol. Specify the address, port, and public key of a 
   * bootstrap node. To spawn a new network where we are the first bootstrap node, just pass our
   * own public address, port, and public key.
   */ 
  async start(addr, port, public_key) {
    Journal.log(Passerby.TAG, `Welcome to Passerby v${Passerby.V}`);
    await this.transport.start();
    const network_info = await this.whoami.ask(new Rinfo({address: addr, port: port}));

    if (network_info === null) {
      throw new Error("Whoami failed!");
    }

    const [my_addr, my_port] = network_info;
    this.dht = new Kademlia(this.bus, this.generate_id.bind(this), my_addr, my_port, public_key);
    this.dht.bootstrap({addr: addr, port: port, public_key: public_key});
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
  async send_secure({type = Codec.MSG_TYPE.APPLICATION, body, body_type, rinfo, gen, ttl} = {}) {
    const session_key = this.sessions.get(JSON.stringify(rinfo));

    if (!session_key) {
      this.sessions.set(JSON.stringify(rinfo), await this.handshake.begin(rinfo));
    }

    const encoded = Codec.encode({
      body: body, 
      body_type: body_type,
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
      this.bus.emit(decoded.header.type, decoded.header.gen, decoded.body, rinfo);
    }
  }

  /**
   * This handler is invoked when a higher level module announces an outbound message on the message
   * bus (we must encode it, encrypt it, and send it to the transport)
   */ 
  _outbound(type, body, body_type, rinfo, gen, ttl) {
    this.send_secure({type: type, body: body, body_type: body_type, rinfo: rinfo, gen: gen, ttl: ttl});
  }  
}

module.exports = { Passerby };