"use strict";

const { MSG_TYPE } = require("./message.js");

/**
 * Log is an indexed data structure which helps us read log messages faster than O(n). Messages are 
 * grouped according to the remote operation they're associated with, and each message group is 
 * indexed on the digest of the initiating client's original request message.
 */ 

class Log {
  constructor() {
    this._data = new Map();
  }

  /**
   * Append a message to the log and return the Op object which encapsulates its message group
   */ 
  append(digest, msg) {
    if (!this._data.has(digest)) {
      this._data.set(digest, new Op());
    }

    const op = this._data.get(digest);
    op.get_type(msg.type).push(msg);
    return op;
  }
}

class Op {
  constructor() {
    const type_str = Object.keys(MSG_TYPE);
    this[type_str[MSG_TYPE.REQUEST]] = [];
    this[type_str[MSG_TYPE.PRE_PREPARE]] = [];
    this[type_str[MSG_TYPE.PREPARE]] = [];
    this[type_str[MSG_TYPE.COMMIT]] = [];
    this.committed_local = false;
  }

  get_type(type) {
    return this[Object.keys(MSG_TYPE)[type]];
  }
}

module.exports = { Log };