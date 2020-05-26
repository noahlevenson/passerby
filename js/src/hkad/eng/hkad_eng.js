/** 
* HKAD_ENG
* Base class for an HKAD engine module
* Engine modules abstract the problem of keeping message state -- correlating previously sent 
* requests with incoming responses and dispatching the appropriate action
*
*
*/ 

"use strict";

class Hkad_eng {
	node;

	constructor() {
		this.node = null;
	}

	_on_message(msg) {
		throw new Error("Subclasses must implement the _on_message() method");
	}

	_send(msg, node_info, success, timeout) {
		throw new Error("Subclasses must implement the _send() method");
	}
}

module.exports.Hkad_eng = Hkad_eng;