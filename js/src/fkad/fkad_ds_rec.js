/** 
* FKAD_DS_REC
* An FKAD_DS record
* 
* 
* 
* 
*/ 

"use strict";

class Fkad_ds_rec {
  ttl;
  created;
  data;

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

module.exports.Fkad_ds_rec = Fkad_ds_rec;