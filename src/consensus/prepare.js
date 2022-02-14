"use strict";

const { MSG_TYPE, message, commit_data} = require("./message.js");

async function _prepare(gen, body, rinfo) {
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

module.exports = { _prepare };