/** 
* FBUY_STATUS
* Encapsulates a status information  
* for a given transaction ID
*
*
*
*/ 

"use strict";

class Fbuy_status {
  static CODE = {
    CONFIRMED: 0
  }

  id;
  code;

  constructor({id = null, code = null} = {}) {
    this.id = id;
    this.code = code;
  }
}

module.exports.Fbuy_status = Fbuy_status;