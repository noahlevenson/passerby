/** 
* FKAD_ENG_ALPHA
* The default FKAD engine module
* Engine Alpha takes an event driven approach, using Promises to
* manage the lifetime of each request
*
*
*/ 

"use strict";

const EventEmitter = require("events");
const { Fkad_eng } = require("./fkad_eng.js");
const { Fkad_msg } = require("../fkad_msg.js");
const { Fkad_node_info } = require("../fkad_node_info.js");

class Fkad_eng_alpha extends Fkad_eng {
  static DEFAULT_TTL = 5000;

  res;

  constructor() {
    super();
    this.res = new EventEmitter();
  }
  
  _on_message(msg) {
    // TODO: Is it safe to assume that the message is an Fkad_msg?
    this.node._routing_table_insert(msg.from);
    
    if (msg.type === Fkad_msg.TYPE.RES) {
      this.res.emit(`${msg.id.toString()}`, msg);
    } else {
      this.node._on_req(msg);
    }
  }

  _send(msg, node_info, success = () => {}, timeout = () => {}, ttl = Fkad_eng_alpha.DEFAULT_TTL) {
    if (msg.type === Fkad_msg.TYPE.REQ) {
      const outgoing = new Promise((resolve, reject) => {
        const timeout_id = setTimeout(() => {
          this.res.removeAllListeners(`${msg.id.toString()}`);
          // TODO: Maybe we should reject with an err code
          reject();
        }, ttl);

        this.res.once(`${msg.id.toString()}`, (res_msg) => {
          clearTimeout(timeout_id);
          success(res_msg, this.node);
          // TODO: Maybe we should resolve with a value
          resolve();
        });
      }).catch((reason) => {
        /**
         * Currently we are prohibited from locking ourselves, mostly to avoid cases where network
         * issues might result in our locking every contact in our routing table. TODO: this is 
         * implemented largely (solely?) to prevent the case where a call to _get_nodes_closest_to() 
         * returns zero contacts. There's likely a better way to do this.
         */ 
        if (!Fkad_node_info.compare(node_info, this.node.node_info)) {
          const bucket = this.node.find_kbucket_for_id(node_info.node_id).get_data();
          const kbucket_rec = bucket.exists(node_info);

          if (kbucket_rec !== null && !kbucket_rec.is_locked()) {
            kbucket_rec.lock();
          }
        }
        
        timeout();
      });
    }

    this.node.net._out(msg, node_info); 
  }
}

module.exports.Fkad_eng_alpha = Fkad_eng_alpha;