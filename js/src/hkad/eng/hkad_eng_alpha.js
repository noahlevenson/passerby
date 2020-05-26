/** 
* HKAD_ENG_ALPHA
* Engine Alpha, the default HKAD engine module
* Engine Alpha takes an event driven approach and uses Promises to
* manage the lifetime of each request individually 
*
*
*/ 

"use strict";

const EventEmitter = require("events");
const { Hkad_eng } = require("./hkad_eng.js");
const { Hkad_msg } = require("../hkad_msg.js");

class Hkad_eng_alpha extends Hkad_eng {
	static TIMEOUT = 5000;
	static RES_EVENT_PREFIX = "r+";
	
	res;

	constructor() {
		super();
		this.res = new EventEmitter();
	}
	
	_on_message(msg) {
		// TODO: Is it safe to assume that the message is an Hkad_msg?
		this.node._update_kbucket(msg);
		
		if (msg.type === Hkad_msg.TYPE.RES) {
			this.res.emit(`${Hkad_eng_alpha.RES_EVENT_PREFIX}${msg.id.toString()}`, msg);
		} else {
			this.node._on_req(msg);
		}
	}

	_send(msg, node_info, success, timeout)  {
		if (msg.type === Hkad_msg.TYPE.REQ) {
			const outgoing = new Promise((resolve, reject) => {
				const timeout_id = setTimeout(() => {
					this.res.removeAllListeners(`${Hkad_eng_alpha.RES_EVENT_PREFIX}${msg.id.toString()}`);
					reject(); // TODO: Maybe we should reject with a proper error code etc
				}, Hkad_eng_alpha.TIMEOUT);

				this.res.once(`${Hkad_eng_alpha.RES_EVENT_PREFIX}${msg.id.toString()}`, (res_msg) => {
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

module.exports.Hkad_eng_alpha = Hkad_eng_alpha;