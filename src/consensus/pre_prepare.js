"use strict";

const { MSG_TYPE, message, prepare_data} = require("./message.js");
const { Entry } = require("./log.js");

async function _pre_prepare(gen, body, rinfo) {
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

  if (!this.log.has(body.data.d)) {
    this.log.set(body.data.d, new Entry());
  }

  const entry = this.log.get(body.data.d);
  entry.pre_prepare.push(body);
  entry.request = req_msg;

  // TODO: Temporary hack while we figure out how to correctly parameterize sequence numbers by 
  // DHT key - just advance our clock to the max of our current sequence # and this inbound sequence #
  this._n = Math.max(this._n, body.data.n); 

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

module.exports = { _pre_prepare };