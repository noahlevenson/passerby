"use strict";

const Journal = require("../core/journal.js");

class Kbucket {
  constructor({max_size, prefix} = {}) {
    this.max_size = max_size;
    this.prefix = prefix;
    this.data = [];
    this.touch();
  }

  /**
   * Fetch a Record from this k-bucket by index
   */ 
  get(i) {
    return this.data[i];
  } 

  /**
   * Return this Kbucket's prefix
   */ 
  get_prefix() {
    return this.prefix;
  }

  /**
   * Set time last touched (ms since Unix Epoch)
   */ 
  touch() {
    this.touched = Date.now();
  }

  /**
   * Get time last touched
   */ 
  get_touched() {
    return this.touched;
  }

  /**
   * Has this Kbucket reached max capacity?
   */ 
  is_full() {
    return this.data.length >= this.max_size;
  }

  /**
   * Return the current length of this Kbucket
   */ 
  length() {
    return this.data.length;
  }

  /**
   * Enqueue a Record, evicting the least recently seen
   */ 
  enqueue(rec) {
    // TODO: for sanity during development
    if (!(rec instanceof Record)) {
      throw new Error("rec must be instance of Record");
    }

    // For safety, since all the kbucket records in a kbucket must describe unique contacts
    if (this.exists(rec.node_info)) {
      return;
    }

    this.data.push(rec);

    if (this.data.length > this.max_size) {
      this.data.shift();
    }
  }

  /**
   * Check whether a Record for a given Node_info exists in this k-bucket.
   * Return a reference to the existing Record, or null if nonexistent
   */  
  exists(node_info) {
    for (let i = 0; i < this.data.length; i += 1) {
      const c = this.data[i];

      if (c.node_info.node_id.equals(node_info.node_id) && c.node_info.addr === node_info.addr && 
        c.node_info.port === node_info.port) {
        return c;
      }
    }

    return null;
  }

  /**
   * Delete a Record from this k-bucket. rec must be a reference to an 
   * Record that exists in this k-bucket
   */ 
  delete(rec) {
    this.data.splice(this.data.indexOf(rec), 1);
  }

  /**
   * Return a shallow copy of this Kbucket's underlying array
   */ 
  to_array() {
    return [...this.data];
  }
}

class Record {
  static MAX_LOCK_ATTEMPTS = 3;
  static LOCK_BASE_SECONDS = 100;
  static BACKOFF_FUNC = x => (Record.LOCK_BASE_SECONDS ** x) * 1000;

  constructor({node_info, lock_until = Number.NEGATIVE_INFINITY, n_locks = 0} = {}) {
    this.node_info = node_info;
    this.lock_until = lock_until;
    this.n_locks = n_locks;
  }

  is_locked() {
    return this.lock_until > Date.now();
  }

  is_stale() {
    return this.n_locks === Record.MAX_LOCK_ATTEMPTS;
  }

  lock(reason = "Unknown") {
    if (this.is_stale()) {
      return;
    }

    this.n_locks += 1;
    const ttl = !this.is_stale() ? Record.BACKOFF_FUNC(this.n_locks) : Number.POSITIVE_INFINITY;
    this.lock_until = Date.now() + ttl;

    Journal.log(`Locked contact ${this.node_info.node_id.toString()} ` + 
      `(${this.node_info.addr}:${this.node_info.port}) <${reason}> ` + 
        `${this.n_locks}/${Record.MAX_LOCK_ATTEMPTS} ` + 
        `(${ttl < Number.POSITIVE_INFINITY ? (ttl / 1000).toFixed(1) + " sec" : "permanent"})`);
  }  
}

module.exports = { Kbucket, Record };