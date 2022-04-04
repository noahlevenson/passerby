"use strict";

const { MSG_TYPE, message, commit_data} = require("./message.js");

async function _prepare(gen, body, rinfo) {
  /**
   * TODO: Perform the checks: Verify the sigs, make sure we're in the same view number, make sure
   * the seq number is between h and H
   */ 

  /**
   * TODO: Do I need to agree that I'm in the replica set here again? Prob not bc we've cached it
   * in the log on pre prepare, right?
   */ 
  const op = this.log.append(body.data.d, body);

  /**
   * Evaluate the prepared predicate. There's 3 properties: Bob's original msg is present in the log,
   * a pre prepare msg for Bob's msg is in the log, and 2 * f valid prepare messages for Bob's msg
   * are present in the log
   */ 
  const orig_msg_exists = op.get_type(MSG_TYPE.REQUEST).length > 0;
  const pre_prepare = op.get_type(MSG_TYPE.PRE_PREPARE);
 
  if (orig_msg_exists && pre_prepare.length > 0) {
    /**
     * We fetch the replica set from the pre prepare msg in the log
     */ 
    const f = this.repman.compute_f(pre_prepare[0].r);

    const prepared = op.get_type(MSG_TYPE.PREPARE).filter((msg) => {
      return true;

      /**
       * TODO: Perform the checks: The msg must have the same view number and seq number... also, 
       * ensure that all the prepared messages are from those who we consider to be valid replicas
       * (by comparing to the replica set cached on the pre prepare)
       */
    });

    if (prepared.length >= 2 * f) {
      /**
       * The prepared predicate is true! Multicast a commit message to all replicas!
       */ 

      const commit = message({
        type: MSG_TYPE.COMMIT,
        data: commit_data({
          v: body.data.v,
          n: body.data.n,
          d: body.data.d,
          i: this.repman.my_id()
        })
      });

      this._multicast(pre_prepare[0].r, commit);
    }
  }
}

module.exports = { _prepare };