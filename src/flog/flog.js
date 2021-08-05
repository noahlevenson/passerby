/** 
* FLOG
* Logging and messaging
*
*
*
*
*/ 

"use strict";

class Flog {
  static LOGF = console.log;
  static ERRF = console.err;

  static set_log(f) {
    if (typeof f !== "function") {
      throw new TypeError("Argument f must be a function");
    }

    Flog.LOGF = f;
  }

  static set_err(f) {
    if (typeof f !== "function") {
      throw new TypeError("Argument f must be a function");
    }

    Flog.ERRF = f;
  }

  static log(msg, ln = false, tn = false) {
    Flog.LOGF(`${ln ? "\n" : ""} ${new Date().toLocaleString()} ${msg}${tn ? "\n" : ""}`);
  }
}

module.exports.Flog = Flog;