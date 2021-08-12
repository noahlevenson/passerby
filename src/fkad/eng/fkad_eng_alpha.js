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

class Fkad_eng_alpha extends Fkad_eng {
  // TODO: a TIMEOUT value of 1000 makes node lookups nice and snappy, but be careful when
  // evaluating debug builds of clients: a sluggish debug build on a resource constrained device can
  // fail to process queries within 1000ms, and then your node lookups will fail,
  // your sms/status/whatever won't send, and you'll incorrectly think you had an FKAD regression
  static TIMEOUT = 4000;
  static RES_EVENT_PREFIX = "r+";
  
  res;

  constructor() {
    super();
    this.res = new EventEmitter();
  }
  
  _on_message(msg) {
    // TODO: Is it safe to assume that the message is an Fkad_msg?
    this.node._routing_table_insert(msg.from);
    
    if (msg.type === Fkad_msg.TYPE.RES) {
      this.res.emit(`${Fkad_eng_alpha.RES_EVENT_PREFIX}${msg.id.toString()}`, msg);
    } else {
      this.node._on_req(msg);
    }
  }

  _send(msg, node_info, success, timeout)  {
    if (msg.type === Fkad_msg.TYPE.REQ) {
      const outgoing = new Promise((resolve, reject) => {
        const timeout_id = setTimeout(() => {
          this.res.removeAllListeners(`${Fkad_eng_alpha.RES_EVENT_PREFIX}${msg.id.toString()}`);
          // TODO: Maybe we should reject with an err code
          reject();
        }, Fkad_eng_alpha.TIMEOUT);

        this.res.once(`${Fkad_eng_alpha.RES_EVENT_PREFIX}${msg.id.toString()}`, (res_msg) => {
          clearTimeout(timeout_id);

          if (typeof success === "function") {
            success(res_msg, this.node);
          }

          // TODO: Maybe we should resolve with a value
          resolve();
        });
      }).catch((reason) => {
        const bucket = this.node.find_kbucket_for_id(node_info.node_id).get_data();
        const kbucket_rec = bucket.exists(node_info);

        if (kbucket_rec !== null) {
          kbucket_rec.lock();
        }

        if (typeof timeout === "function") {
          timeout();
        }
      });
    }

    this.node.net._out(msg, node_info); 
  }
}

module.exports.Fkad_eng_alpha = Fkad_eng_alpha;