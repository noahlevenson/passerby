/** 
* FKAD_KBUCKET_REC
* A k-bucket record represents a single entity
* in a k-bucket
*
*
*
*/ 

"use strict";

class Fkad_kbucket_rec {
  static MAX_LOCK_ATTEMPTS = 5;
  static FIRST_LOCK_MS = 1000 * 10;
  static BACKOFF_FUNC = x => x * 2;

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
    return this.n_locks >= Fkad_kbucket_rec.MAX_LOCK_ATTEMPTS;
  }  
}

module.exports.Fkad_kbucket_rec = Fkad_kbucket_rec;