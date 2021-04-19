/** 
* FKAD_ENG_ALPHA
* Engine Alpha, the default FKAD engine module
* Engine Alpha takes an event driven approach and uses Promises to
* manage the lifetime of each request individually 
*
*
*/ 

"use strict";

const EventEmitter = require("events");
const { Fkad_eng } = require("./fkad_eng.js");
const { Fkad_msg } = require("../fkad_msg.js");

class Fkad_eng_alpha extends Fkad_eng {
	// TODO: a small value like 1000 makes node lookups nice and snappy, but you should set this higher when evaluating debug builds of clients:
	// a sluggish debug build can fail to process queries within 1000ms, and the result is that node lookups will fail to find peers on the 
	// network, your sms/status/whatever won't send, and you'll think you've had a catastrophic FKAD regression (but you haven't)
	static TIMEOUT = 2000;
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
					reject(); // TODO: Maybe we should reject with a proper error code etc
				}, Fkad_eng_alpha.TIMEOUT);

				this.res.once(`${Fkad_eng_alpha.RES_EVENT_PREFIX}${msg.id.toString()}`, (res_msg) => {
					clearTimeout(timeout_id);

					if (typeof success === "function") {
						success(res_msg, this.node);
					}

					resolve(); // TODO: Maybe we should resolve with a value
				});
			}).catch((reason) => {
				if (typeof timeout === "function") {
					timeout();
				}
			});
		}

		this.node.net._out(msg, node_info);	
	}
}

module.exports.Fkad_eng_alpha = Fkad_eng_alpha;