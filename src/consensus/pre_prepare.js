"use strict";

const { MSG_TYPE, message, prepare_data} = require("./message.js");

async function _pre_prepare(gen, body, rinfo) {
  const instruction = body.data.m.data.o;

  /**
   * Do I agree that I'm in the replica set for this data object? If yes, cache a snapshot of the
   * replica set in the log (below); if not, quit and do nothing
   */ 
  const r = await this.repman.fetch_r(instruction.key);

  if (!r.some(replica => replica.id.equals(this.repman.my_id()))) {
    return;
  }

  /**
   * TODO: Perform the checks: verify the sigs, make sure we're in the same view number, make sure
   * we haven't accepted a prepare msg for this view number and sequence number which has a different
   * digest, and make sure the seq number is between h and H
   */
  
  /**
   * De-piggyback the original message from the body and store it separately!
   * TODO: We do a sneaky thing here by appending the cached replica set to the body of the message...
   * this establishes a convention in an extremely non-explicit way, fix it!
   */ 
  const req_msg = body.data.m;
  body.data.m = null;
  body.r = r;
  this.log.append(body.data.d, body);
  this.log.append(body.data.d, req_msg);

  /**
   * TODO: Temp hack while we figure out how to correctly parameterize sequence numbers by DHT key...
   * just advance our clock to the max of our current seq # and this inbound seq #, a la Lamport
   */ 
  this._n = Math.max(this._n, body.data.n); 

  /**
   * I agree that I'm in the replica set and we've stored what we need to, so I'll multicast a
   * prepare msg and start the view change timer. TODO: Start the timer!
   */ 
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

module.exports = { _pre_prepare };