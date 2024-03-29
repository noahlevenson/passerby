"use strict";

const EventEmitter = require("events");
const Codec = require("./codec.js");
const { Io } = require("./io.js");
const { Db } = require("./db.js");
const { Rinfo } = require("../transport/transport.js");
const { Handshake } = require("./handshake.js");
const { Whoami } = require("../whoami/whoami.js");
const { Kademlia } = require("../dht/dht.js");
const { Psm } = require("../psm/psm.js");
const { Repman } = require("../repman/repman.js");
const { Pbft } = require("../consensus/consensus.js");
const { Pht } = require("../pht/pht.js");
const { key } = require("../pht/key.js");
const { Coord } = require("../core/geo.js");
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
    this.handshake = new Handshake(this.bus, this.next_gen.bind(this));
    this.whoami = new Whoami(this.bus, this.next_gen.bind(this));
    this.dht = null;
    this.psm = null;
    this.repman = null;
    this.consensus = null;
    this.db = null;
    this.pht = null;
  }

  /**
   * Boot this instance of the Passerby protocol, specifying network info for our own node and/or a
   * bootstrap node. There are 3 standard configurations for the arguments here:
   * 
   * 1) You're a peer who wants to join an existing network via a known bootstrap node, but you're 
   * unsure of your public network info (because of NAT or similar issues). Leave my_addr and my_port
   * unspecified, and we'll attempt to auto-resolve your public network info during boot.
   * 
   * 2) You're a peer who wants to join an existing network via a known bootstrap node, and you want
   * to force your own public network info (perhaps because you're using a transport like RS-232 or
   * local network emulation). Just specify my_addr and my_port and we'll use those values during boot.
   * 
   * 3) You intend to be the first node in a newly spawned network. In this case, you are your own
   * bootstrap node, and you must know for certain your public network info. Pass the same address
   * and port values to my_addr, my_port, boot_addr, and boot_port, and you will auto-bootstrap.
   */ 
  async start({my_addr, my_port, my_public_key, boot_addr, boot_port, boot_public_key} = {}) {
    Journal.log(Passerby.TAG, `Welcome to Passerby v${Passerby.V}`);
    await this.transport.start();

    if (!my_addr || !my_port) {
      Journal.log(Passerby.TAG, `No network info specified, attempting resolution...`);
      const network_info = await this.whoami.ask(new Rinfo({address: boot_addr, port: boot_port}));

      if (network_info === null) {
        throw new Error("Whoami failed!");
      }

      [my_addr, my_port] = network_info;
    }

    this.dht = new Kademlia(this.bus, this.next_gen.bind(this), my_addr, my_port, my_public_key);
    this.psm = new Psm(this.bus, this.next_gen.bind(this), this.dht.read.bind(this.dht), this.dht.write.bind(this.dht));
    this.repman = new Repman(this.dht.node_lookup.bind(this.dht), my_addr, my_port, this.dht.node_id);
    this.consensus = new Pbft(this.bus, this.next_gen.bind(this), this.repman, this.psm);
    this.db = new Db(this.consensus);
    this.pht = new Pht(this.db, Passerby.TAG);
    await this.dht.bootstrap({addr: boot_addr, port: boot_port, public_key: boot_public_key});
    await this.pht.init(true);
  }

  /**
   * Disconnect from the network and stop this instance of the Passerby protocol
   */ 
  async stop() {
    await this.transport.stop();
  }

  async read(key) {
    return this.db.read(key);
  }

  async write(key, val) {
    return this.db.write(key, val);
  }

  /**
   * TODO: Actually assert a status object
   */ 
  async assert(lat, lon, pubstring, status) {
    const location = new Coord({lat: lat, lon: lon});
    const location_key = key({integral: location.linearize(), meta: pubstring});
    await this.pht.insert(location_key, status);
    return location;
  }

  /**
   * TODO: We may not actually support deletions
   */ 
  async retract(lat, lon, pubstring) {
    const location = new Coord({lat: lat, lon: lon});
    const location_key = key({integral: location.linearize(), meta: pubstring});
    await this.pht.delete(location_key);
    return location;
  }

  async geosearch(lat, lon, dist, status_cb = () => {}) {
    const bounds = new Coord({lat: lat, lon: lon}).get_exts(dist);
    
    return await this.pht.range_query_2d(
      bounds.get_min().linearize(), 
      bounds.get_max().linearize(), 
      status_cb
    );
  }

  /**
   * Send a message to a remote peer over a secure channel; if a secure channel has not yet been
   * established, we'll execute the handshake protocol first
   */ 
  async send_secure({type = Codec.MSG_TYPE.APPLICATION, body, body_type, rinfo, gen, ttl} = {}) {
    if (type !== Codec.MSG_TYPE.HANDSHAKE) {
      let shake = this.sessions.get(JSON.stringify(rinfo));

      if (!shake) {
        shake = this.handshake.begin(rinfo);
        this.sessions.set(JSON.stringify(rinfo), shake);
      }

      const key = await shake;

      if (!key) {
        this.sessions.delete(JSON.stringify(rinfo));
        return;
      }
    }

    const encoded = Codec.encode({
      body: body, 
      body_type: body_type,
      type: type, 
      gen: gen,
      session_key: key
    });

    this.transport.send(encoded, rinfo, ttl);
  }

  /**
   * We increment our message counter each time we send a message, and wrap it according to the 
   * byte width of the generation field specified in the codec
   */
  next_gen() {
    this._generation = this._generation < Codec.GEN_MAX ? this._generation + 1 : Codec.GEN_MIN;
    return this._generation;
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