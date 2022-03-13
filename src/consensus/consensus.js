"use strict";

const EventEmitter = require("events");
const Codec = require("../protocol/codec.js");
const { Io } = require("../protocol/io.js");
const { Rinfo } = require("../transport/transport.js");
const { to_base64, generic_hash } = require("../core/crypto.js");
const { _request } = require("./request.js");
const { _commit } = require("./commit.js");
const { _pre_prepare } = require("./pre_prepare.js");
const { _prepare } = require("./prepare.js");

const { MSG_TYPE, message, request_data } = require("./message.js");

class Pbft extends Io {
  static DIGEST_LEN = 32;

  constructor(bus, generator, repman, psm) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.CONSENSUS});
    this.repman = repman;
    this.psm = psm;
    this.reply = new EventEmitter();
    this.view = new Map();
    this.log = new Map();
    this.last_reply = new Map();
    this.h = 0;
    this.H = 1000;
    this._n = this.h;
  }

  /**
   * Request execution of a state machine operation. For details about the format of Psm instruction 
   * objects, supported opcodes, and operand structure, refer to the PSM docs.
   */ 
  async request(instruction) {
    const r = await this.repman.fetch_r(instruction.key);
    const f = this.repman.compute_f(r);
    const v = this._get_v(instruction.key);
    const primary = this._get_p(v, r);
    
    const msg = message({
      type: MSG_TYPE.REQUEST, 
      data: request_data({o: instruction, c: this.repman.me})
    });

    /**
     * We can't predict the categories of replies we'll receive, so here's how we handle it: 
     * Accumulate all replies in a Map of discrete categories, somewhat like a histogram, and quit
     * when one of the categories accumulates f + 1 replies
     */ 
    return new Promise((resolve, reject) => {
      const replica_replies = new Map();

      /**
       * We refer to each outbound REQUEST by its timestamp wrt our local clock, and replicas will
       * REPLY to us by referencing that timestamp, so let's start listening for replies now
       */ 
      this.reply.on(msg.data.t, (response) => {
        const category = `${JSON.stringify(response)}`; 

        /**
         * TODO: Is this reply from a valid replica? is the sig valid? See 4.1
         */ 
        let n_received = replica_replies.has(category) ? replica_replies.get(category) + 1 : 1;

        if (n_received > f) {
          this.reply.removeAllListeners(msg.data.t);
          resolve(response);
        }

        replica_replies.set(category, n_received);
      });

      this.send({
        body: msg,
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: new Rinfo({address: primary.address, port: primary.port}),
        gen: this.generator()
      });
    });
  }

  _next_sequence() {
    this._n = this._n < this.H ? this._n + 1 : this.h;
    return this._n;
  }

  _get_p(v, r) {
    return r[v % r.length];
  }

  _get_v(key) {
    return this.view.has(key.to_hex_str()) ? this.view.get(key.to_hex_str()) : 0;
  }

  _digest(msg) {
    return to_base64(generic_hash(Pbft.DIGEST_LEN, JSON.stringify(msg)));
  }

  _multicast(r, msg) {
    const gen = this.generator();

    r.forEach((replica) => {
      this.send({
        body: msg,
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: new Rinfo({address: replica.address, port: replica.port}),
        gen: gen
      });
    });
  }

  async on_message(gen, body, rinfo) {
    switch (body.type) {
      case MSG_TYPE.REQUEST:
        await _request.bind(this)(gen, body, rinfo);
        break;
      case MSG_TYPE.PRE_PREPARE:
        await _pre_prepare.bind(this)(gen, body, rinfo);
        break;
      case MSG_TYPE.PREPARE:
        await _prepare.bind(this)(gen, body, rinfo);
        break;
      case MSG_TYPE.COMMIT:
        await _commit.bind(this)(gen, body, rinfo);
        break;
      case MSG_TYPE.REPLY:
        this.reply.emit(body.data.t, body.data.r);
    }
  }
}

module.exports = { Pbft };