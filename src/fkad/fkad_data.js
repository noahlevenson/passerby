/** 
* FKAD_DATA
* Encapsulates any kind of data that may be sent in a Kademlia message
* 
*
*
*
*/ 

"use strict";

class Fkad_data {
  static TYPE = {
    STRING: 0,
    NODE_LIST: 1,
    PAIR: 2,
    KEY: 3,
    VAL: 4
  };

  type;
  payload;

  // TODO: allowing payload arrays with 0 elements may break conventions established elsewhere...
  constructor({type = null, payload = null} = {}) {
    if (type === null || !Array.isArray(payload)) {
      throw new Error("Argument error");
    }

    this.type = type;
    this.payload = payload;
  }

  get_type() {
    return this.type;
  }

  get_payload() {
    return this.payload;
  }
}

module.exports.Fkad_data = Fkad_data;