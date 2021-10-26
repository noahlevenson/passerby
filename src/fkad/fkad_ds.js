/** 
* FKAD_DS
* An FKAD data store
* 
* 
* 
* 
*/ 

"use strict";

const { Fkad_ds_rec } = require("./fkad_ds_rec.js");

class Fkad_ds {
  data;

  constructor() {
    this.data = new Map();
  }

  put({key, val, ttl} = {}) {
    const rec = new Fkad_ds_rec({
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

module.exports.Fkad_ds = Fkad_ds;