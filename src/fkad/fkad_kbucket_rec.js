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
  static MAX_LOCK_ATTEMPTS = 3;
  static LOCK_BASE_SECONDS = 100;
  static BACKOFF_FUNC = x => (Fkad_kbucket_rec.LOCK_BASE_SECONDS ** x) * 1000;

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
    return this.n_locks === Fkad_kbucket_rec.MAX_LOCK_ATTEMPTS;
  }

  lock() {
    if (this.is_stale()) {
      return;
    }

    this.n_locks += 1;
    const ttl = !this.is_stale() ? Fkad_kbucket_rec.BACKOFF_FUNC(this.n_locks) : Number.POSITIVE_INFINITY;
    this.lock_until = Date.now() + ttl;

    Flog.log(`[FKAD] Locked contact ${this.node_info.node_id.toString()} ` + 
      `(${this.node_info.addr}:${this.node_info.port}) ` + 
        `${this.n_locks}/${Fkad_kbucket_rec.MAX_LOCK_ATTEMPTS} ` + 
        `(${ttl < Number.POSITIVE_INFINITY ? (ttl / 1000).toFixed(1) + " sec" : "permanent"})`);
  }  
}

module.exports.Fkad_kbucket_rec = Fkad_kbucket_rec;