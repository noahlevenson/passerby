/** 
* FBUY_SMS
* A short text message and accompanying 
* data, useful for chat
* 
* 
* 
*/ 

"use strict";

const { Fid_pub } = require("../fid/fid_pub.js");

class Fbuy_sms {
  static MAX_CHARS = 4096;

  text;
  data;
  from;

  constructor({text = null, data = [], from = null} = {}) {
    if (!Array.isArray(data)) {
      throw new TypeError("Argument 'data' must be array");
    }

    // Enforce MAX_CHARS
    if (text === null) {
      this.text = text;
    } else {
      this.text = text.length < Fbuy_sms.MAX_CHARS ? text : text.substring(0, Fbuy_sms.MAX_CHARS);
    }

    this.data = data;
    this.from = from;
  }
}

module.exports.Fbuy_sms = Fbuy_sms;