"use strict";

class Store {
  constructor() {
    this.data = new Map();
  }

  put({key, val, ttl} = {}) {
    const rec = new Record({
      ttl: ttl,
      data: val
    });

    this.data.set(key.toString(), rec);
  }

  get(key) {
    return this.data.get(key.toString());
  }

  /**
   * Fetch an array of all keys as strings
   */ 
  keys() {
    return Array.from(this.data.keys());
  }

  delete(key) {
    return this.data.delete(key.toString());
  }
}

class Record {
  constructor({ttl, data} = {}) {
    if (typeof ttl !== "number" || !data) {
      throw new Error("Must supply values for 'ttl' and 'data'");
    }

    this.ttl = ttl;
    this.data = data;
    this.created = Date.now();
  }

  get_created() {
    return this.created;
  }

  get_ttl() {
    return this.ttl;
  }

  get_data() {
    return this.data;
  }
}

module.exports = { Store };