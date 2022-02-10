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

    this.data.set(key.to_hex_str(), rec);
  }

  get(key) {
    const key_str = key.to_hex_str();
    const rec = this.data.get(key_str);

    // Case 1: We don't have a record for this value
    if (!rec) {
      return;
    }

    // Case 2: We have a record, but it's expired, so lazy delete it
    if (rec.get_created() < (Date.now() - rec.get_ttl())) {
      this.data.delete(key_str);
      return;
    }

    // Case 3: We have an unexpired record for this value, so return the value
    return rec.get_data();
  }

  /**
   * Fetch an array of all keys as strings
   */ 
  keys() {
    return Array.from(this.data.keys());
  }

  delete(key) {
    return this.data.delete(key.to_hex_str());
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