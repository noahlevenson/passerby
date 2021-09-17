/** 
* FDLT_MSG
* An FDLT message 
* 
* 
*
*
*/ 

"use strict";

class Fdlt_msg {
  static ID_LEN = 12;

  static TYPE = {
    REQ: 0,
    RES: 1
  };

  /**
   * Our message types are similar to Bitcoin's message types, but we currently deploy them in an 
   * unsolicited fashion: nodes just broadcast blocks as TX and BLOCK messages without first sending
   * an INV; a GETBLOCKS REQ advertises a last known hash and a list of avail blocks is sent in the 
   * RES; GETDATA requests one block by hash and the response is sent in the RES. TODO: when we 
   * get around to optimizing the message system, we'll prob want to make everything solicited...
   */ 
  static FLAVOR = {
    TX: 0,
    BLOCK: 1,
    GETBLOCKS: 2,
    GETDATA: 3,
  };

  data;
  type;
  flavor;
  app_id;
  id;

  constructor({data = null, type = null, flavor = null, app_id = null, id = null} = {}) {
    // TODO: For sanity during development, explicitly require values 
    if (data === null || type === null || flavor === null || app_id === null || id === null) {
      throw new Error("Arguments cannot be null");
    }

    this.data = data;
    this.type = type;
    this.flavor = flavor;
    this.app_id = app_id;
    this.id = id;
  }
};

module.exports.Fdlt_msg = Fdlt_msg;