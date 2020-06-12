/** 
* HLOG
* Logging and messaging
*
*
*
*
*/ 

"use strict";

class Hlog {
	static LOGF = console.log;
	static ERRF = console.err;

	static set_log(f) {
		if (typeof f !== "function") {
			throw new TypeError("Argument f must be a function");
		}

		Hlog.LOGF = f;
	}

	static set_err(f) {
		if (typeof f !== "function") {
			throw new TypeError("Argument f must be a function");
		}

		Hlog.ERRF = f;
	}

	static log(msg, ln = false, tn = false) {
		Hlog.LOGF(`${ln ? "\n" : ""} ${new Date().toLocaleString()} ${msg}${tn ? "\n" : ""}`);
	}
}

module.exports.Hlog = Hlog;