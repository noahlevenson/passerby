/** 
* FBUY_STATUS
* Encapsulates one status information update
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