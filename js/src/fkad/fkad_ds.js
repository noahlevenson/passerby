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

    this.data.set(key, rec);
  }

  get(key) {
    return this.data.get(key);
  }

  // Get a 2D array of all [key, val] pairs
  entries() {
    return Array.from(this.data.entries());
  }

  delete(key) {
    return this.data.delete(key);
  }
}

module.exports.Fkad_ds = Fkad_ds;