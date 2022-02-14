"use strict";

const EventEmitter = require("events");
const Codec = require("../protocol/codec.js");
const { Io } = require("../protocol/io.js");
const { Rinfo } = require("../transport/transport.js");
const { to_base64, generic_hash } = require("../core/crypto.js");
const { MSG_TYPE, message, request_data, reply_data, pre_prepare_data, prepare_data, 
  commit_data } = require("./message.js");

class Pbft extends Io {
  static DIGEST_LEN = 32;

  constructor(bus, generator, repman, psm) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.CONSENSUS});
    this.repman = repman;
    this.psm = psm;
    this.reply = new EventEmitter();
    this.view = new Map();
    this.log = [];
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
        /**
         * TODO: Is this reply from a valid replica? is the sig valid? See 4.1
         */ 
        let n_received = replica_replies.has(response) ? replica_replies.get(response) + 1 : 1;

        if (n_received > f) {
          this.reply.removeAllListeners(msg.data.t);
          resolve(response);
        }

        replica_replies.set(response, n_received);
      });

      this.send({
        body: msg,
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: new Rinfo({address: primary.address, port: primary.port}),
        gen: this.generator()
      });
    });
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

  async _on_request(gen, body, rinfo) {
    const instruction = body.data.o;

    // First: Do I agree that I'm the primary replica for this data object? If not, forward it
    // to who I believe to be the primary replica
    const r = await this.repman.fetch_r(instruction.key);
    const v = this._get_v(instruction.key);
    const primary = this._get_p(v, r);

    if (!this.repman.my_id().equals(primary.id)) {
      this.send({
        body: body,
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: new Rinfo({address: primary.address, port: primary.port}),
        gen: this.generator()
      });

      return;
    }

    // OK, I think I'm the primary replica, so I will multicast a pre-prepare to the backups
    const pre_prepare = message({
      type: MSG_TYPE.PRE_PREPARE,
      data: pre_prepare_data({
        v: this._get_v(instruction.key), 
        n: 0, // TODO: PLACEHOLDER SEQUENCE NUMBER
        d: this._digest(body),
        m: body
      })
    });

    // const backups = r.filter(replica => !replica.id.equals(this.repman.my_id()));
    // TODO: We currently broadcast the pre-prepare even to ourself, to handle the case where 
    // we're the only replica for a data object?
    this._multicast(r, pre_prepare);
  }

  async _on_pre_prepare(gen, body, rinfo) {
    const instruction = body.data.m.data.o;

    // First: Do I agree that I'm in the replica set for this data object? If so, cache a snapshot
    // the replica set in the log (below); if not, silently quit
    const r = await this.repman.fetch_r(instruction.key);

    if (!r.some(replica => replica.id.equals(this.repman.my_id()))) {
      return;
    }

    // TODO: Perform the checks: verify the signatures, make sure we're in the same view number, 
    // make sure we haven't accepted a prepare msg for this view number and sequence number 
    // which has a diff digest, and make sure the sequence number is between h and H
    
    // de-piggyback the original message from the body and store it separately -- TODO: we also do
    // a sneaky and ill advised thing here and append the cached replica set to the body of the message
    const req_msg = body.data.m;
    body.data.m = null;
    body.r = r;
    this.log.push(body);
    this.log.push(req_msg)

    // I agree that I'm in the replica set and we've stored what we need to, so I will multicast
    // a prepare message and start the view change timer. TODO: start the timer
    const prepare = message({
      type: MSG_TYPE.PREPARE,
      data: prepare_data({
        v: body.data.v,
        n: body.data.n,
        d: body.data.d,
        i: this.repman.my_id() // TODO: can we send client ID instead of replica index?
      })
    });    

    this._multicast(r, prepare);
  }

  async _on_prepare(gen, body, rinfo) {
    // TODO: Perform the checks:  verify the signatures, make sure we're in the same view number,
    // make sure the sequence number is between h and H

    // TODO: Do I need to agree that I'm in the replica set here again? prob not bc we've cached it
    // in the log on pre prepare, right?

    this.log.push(body);

    // Now we evaluate the PREPARED PREDICATE. TODO: This is massively inefficient O(n) through
    // the log, we can invent a better system than this. There's three properties which comprise
    // the predicate: bob's original message is present in the log, a pre-prepare message for 
    // bob's message is in the log, and 2 * f valid prepare messages for bob's message are 
    // present in the log
    const orig_msg_exists = this.log.some(msg => this._digest(msg).localeCompare(body.data.d) === 0);
    
    const pre_prepare = this.log.filter(msg => 
      msg.type === MSG_TYPE.PRE_PREPARE && msg.data.d.localeCompare(body.data.d) === 0)[0];

    if (orig_msg_exists && pre_prepare) {
      // To determine the value of 2 * f, we fetch the replica set off of the pre prepare message in the log
      const f = this.repman.compute_f(pre_prepare.r);

      const prepared = this.log.filter((msg) => {
        // TODO: apply the other checks: the message must have the same view number and sequence number

        // Also, we must ensure that all the prepared messages are from who we consider to be valid
        // replicas (by comparing to the replica set cached on the pre-prepare...)

        return msg.type === MSG_TYPE.PREPARE && msg.data.d.localeCompare(body.data.d) === 0;
      });

      if (prepared.length >= 2 * f) {
        // The PREPARED PREDICATE is TRUE, multicast a commit message to all replicas!

        const commit = message({
          type: MSG_TYPE.COMMIT,
          data: commit_data({
            v: body.data.v,
            n: body.data.n,
            d: body.data.d,
            i: this.repman.my_id()
          })
        });

        this._multicast(pre_prepare.r, commit);
      }
    }
  }

  async _on_commit(gen, body, rinfo) {
    // TODO: Perform the checks:  verify the signatures, make sure we're in the same view number,
    // make sure the sequence number is between h and H

    this.log.push(body);

    // Now we evaluate the COMMITED PREDICATE.  TODO: As above, this is massively inefficient O(n)
    // through the log...

    const committed = this.log.filter((msg) => {
      return msg.type === MSG_TYPE.COMMIT && msg.data.d.localeCompare(body.data.d) === 0;

      // TODO: we must ensure that all the commited messages are from who we consider to be valid
      // replicas (by comparing to the replica set cached on the pre-prepare...)
    });

    // TODO: We have to fetch the pre prepare here just to fetch the cached replica set :(
    const pre_prepare = this.log.filter(msg => 
      msg.type === MSG_TYPE.PRE_PREPARE && msg.data.d.localeCompare(body.data.d) === 0)[0];

    const f = this.repman.compute_f(pre_prepare.r);

    if (committed.length >= f + 1) {
      // The COMMITED PREDICATE IS TRUE

      // Now we evaluate the COMMITED LOCAL PREDICATE, also massively inefficient O(n) through the log...
      const self_prepared = this.log.some(msg => msg.type === MSG_TYPE.COMMIT && msg.data.i.equals(this.repman.my_id()));

      const commits = this.log.filter((msg) => {
        // TODO: apply the other checks: the message must have the same view number and sequence number

        return msg.type === MSG_TYPE.COMMIT && msg.data.d.localeCompare(body.data.d) === 0;
      });

      if (commits.length >= f * 2 + 1) {
        // ACCEPT THE COMMIT, fetch Bob's original message from the log, send to the state machine, 
        // get the result and send a reply to Bob

        const msg = this.log.filter(msg => this._digest(msg).localeCompare(body.data.d) === 0)[0];
        const res = await this.psm.exec(msg.data.o);

        this.send({
          body: message({type: MSG_TYPE.REPLY, data: reply_data({v: this._get_v(msg.data.o.key), t: msg.data.t, r: res})}),
          body_type: Codec.BODY_TYPE.JSON,
          rinfo: new Rinfo({address: msg.data.c.address, port: msg.data.c.port}),
          gen: Codec.get_gen_res(gen)
        });
      }
    }
  }

  async on_message(gen, body, rinfo) {
    // TODO: you don't need a switch, just put the handlers in a map

    switch (body.type) {
      case MSG_TYPE.REQUEST:
        await this._on_request(gen, body, rinfo);
        break;
      case MSG_TYPE.PRE_PREPARE:
        await this._on_pre_prepare(gen, body, rinfo);
        break;
      case MSG_TYPE.PREPARE:
        await this._on_prepare(gen, body, rinfo);
        break;
      case MSG_TYPE.COMMIT:
        await this._on_commit(gen, body, rinfo);
        break;
      case MSG_TYPE.REPLY:
        this.reply.emit(body.data.t, body.data.r);
    }
  }
}

module.exports = { Pbft };