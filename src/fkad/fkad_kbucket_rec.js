/** 
* FKAD_KBUCKET_REC
* A k-bucket record represents a single entity
* in a k-bucket
*
*
*
*/ 

"use strict";

const { Flog } = require("../flog/flog.js");

class Fkad_kbucket_rec {
  static MAX_LOCK_ATTEMPTS = 4;
  static FIRST_LOCK_MS = 1000 * 10;
  static BACKOFF_FUNC = x => Fkad_kbucket_rec.FIRST_LOCK_MS ** x;

  node_info;
  lock_until;
  n_locks;

  constructor({node_info = null, lock_until = Number.NEGATIVE_INFINITY, n_locks = 0} = {}) {
    this.node_info = node_info;
    this.lock_until = lock_until;
    this.n_locks = n_locks;
  }

  is_locked() {
    return this.lock_until > Date.now();
  }

  is_stale() {
    return this.n_locks > Fkad_kbucket_rec.MAX_LOCK_ATTEMPTS;
  }

  lock() {
    this.n_locks += 1;
    const duration = Fkad_kbucket_rec.BACKOFF_FUNC(this.n_locks);
    this.lock_until = Date.now() + duration;
    Flog.log(`[FKAD] Locked contact ${this.node_info.node_id.toString()} ` + 
      `(${this.node_info.addr}:${this.node_info.port}) for ${duration} ms ` +
        `${this.n_locks}/${Fkad_kbucket_rec.MAX_LOCK_ATTEMPTS}`);
  }  
}

module.exports.Fkad_kbucket_rec = Fkad_kbucket_rec;