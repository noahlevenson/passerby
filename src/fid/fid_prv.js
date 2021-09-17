/** 
* FID_PRV
* Private user info
* 
* 
* 
*
*/ 

"use strict";

class Fid_prv {
  privkey;

  constructor({privkey = null} = {}) {
    this.privkey = privkey;
  }
}

module.exports.Fid_prv = Fid_prv;