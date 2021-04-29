/** 
* FSTUN_CONTAINER
* Data structures used by FSTUN
* 
* 
* 
* 
*/ 

"use strict";

class Fstun_type_data {
  constructor(type = null, bin = null, f = null) {
    this.type = type;
    this.bin = bin;
    this.f = f;
  }
}

module.exports.Fstun_type_data = Fstun_type_data;