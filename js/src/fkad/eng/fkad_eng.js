/** 
* FKAD_ENG
* Base class for an FKAD engine module
* Engine modules abstract the problem of keeping message state,  
* correlating requests with incoming responses and dispatching 
* the appropriate action
*
*/ 

"use strict";

class Fkad_eng {
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

module.exports.Fkad_eng = Fkad_eng;