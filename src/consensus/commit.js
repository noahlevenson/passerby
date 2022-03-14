"use strict";

const { MSG_TYPE, message, reply_data} = require("./message.js");
const Codec = require("../protocol/codec.js");
const { Rinfo } = require("../transport/transport.js");

async function _commit(gen, body, rinfo) {
  // TODO: Perform the checks:  verify the signatures, make sure we're in the same view number,
  // make sure the sequence number is between h and H
  const op = this.log.append(body.data.d, body);

  // Now we evaluate the COMMITTED PREDICATE
  const committed = op.get_type(MSG_TYPE.COMMIT).filter((msg) => {
    return true;

    // TODO: we must ensure that all the commited messages are from who we consider to be valid
    // replicas (by comparing to the replica set cached on the pre-prepare...)
  });

  // TODO: We have to fetch the pre prepare here just to fetch the cached replica set :(
  const pre_prepare = op.get_type(MSG_TYPE.PRE_PREPARE)[0];

  // TODO: We saw an error in emulation testing where there was no pre prepare message for a commit...
  // not sure why that would happen except for an adversarial situation, but since we must be 
  // pre-prepared to be committed, we just quit?
  if (!pre_prepare) {
    return;
  }

  const f = this.repman.compute_f(pre_prepare.r);

  if (committed.length >= f + 1) {
    // The COMMITTED PREDICATE IS TRUE

    if (op.committed_local) {
      return;
    }

    // Now we evaluate the COMMITTED LOCAL PREDICATE, inefficient O(n) through the log entry :\
    const self_prepared = op.get_type(MSG_TYPE.COMMIT).some(msg => 
      msg.data.i.equals(this.repman.my_id()));

    const commits = op.get_type(MSG_TYPE.COMMIT).filter((msg) => {
      return true;

      // TODO: apply the checks: the message must have the same view number and sequence number
    });

    if (commits.length >= f * 2 + 1) {
      // ACCEPT THE COMMIT, fetch Bob's original message from the log, send to the state machine, 
      // get the result and send a reply to Bob

      const msg = op.get_type(MSG_TYPE.REQUEST)[0];
      op.committed_local = true;
      
      const res = await this.psm.exec(msg.data.o);

      const reply = message({
        type: MSG_TYPE.REPLY, 
        data: reply_data({v: this._get_v(msg.data.o.key), t: msg.data.t, r: res})
      });

      this.send({
        body: reply,
        body_type: Codec.BODY_TYPE.JSON,
        rinfo: new Rinfo({address: msg.data.c.address, port: msg.data.c.port}),
        gen: Codec.get_gen_res(gen)
      });

      this.last_reply.set(msg.data.c.id.to_hex_str(), reply);
    }
  }
}

module.exports = { _commit };