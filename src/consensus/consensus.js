"use strict";

const EventEmitter = require("events");
const Codec = require("../protocol/codec.js");
const { Io } = require("../protocol/io.js");
const { MSG_TYPE, message, request_data, reply_data } = require("./message.js");
 
class Pbft extends Io {
  constructor(bus, generator, repman, psm, f_sz) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.CONSENSUS});
    this.repman = repman;
    this.psm = psm;
    this.f_sz = f_sz;
    this.reply = new EventEmitter();
  }

  /**
   * Request execution of a state machine operation for a given key. For details about the format of
   * Psm instruction objects, supported opcodes, and operand structure, refer to the PSM docs.
   */ 
  async exec(instruction) {
    const r = await this.repman.fetch_r(instruction.key);
    const primary = this._get_p(0, r); // TODO: note the placeholder view number 0 here
    const msg = message({type: MSG_TYPE.REQUEST, data: request_data({o: instruction})});

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
        /**
         * TODO: Is this reply from a valid replica? is the sig valid? See 4.1
         */ 
        let n_received = replica_replies.has(response) ? replica_replies.get(response) + 1 : 1;

        if (n_received > this.f_sz) {
          this.reply.removeAllListeners(msg.data.t);
          resolve(response);
        }

        replica_replies.set(response, n_received);
      });

      this.send({
        body: msg,
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: primary,
        gen: this.generator()
      });
    });
  }

  _get_p(v, r) {
    return r[v % r.length];
  }

  async on_message(gen, body, rinfo) {
    /**
     * TODO: Actually handle the message and do PBFT. For now in this stub, we don't coordinate any 
     * backup replicas whatsoever - we just locally execute the requested operation against our own 
     * PSM and send a half-formed reply to the client with our result
     */ 

    switch (body.type) {
      case MSG_TYPE.REQUEST:
        const res = await this.psm.exec(body.data.o);
        
        this.send({
          body: message({type: MSG_TYPE.REPLY, data: reply_data({v: 0, t: body.data.t, r: res})}),
          body_type: Codec.BODY_TYPE.JSON,
          rinfo: rinfo,
          gen: Codec.get_gen_res(gen)
        });

        break;
      case MSG_TYPE.REPLY:
        this.reply.emit(body.data.t, body.data.r);
    }
  }
}

module.exports = { Pbft };