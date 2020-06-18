/** 
* HBUY
* HBUY provides an interface for sending and receiving HBUY messages
* 
* 
* 
* 
*/ 

"use strict";

const EventEmitter = require("events");
const { Happ_env } = require("../happ/happ_env.js");
const { Hbuy_net } = require("./net/hbuy_net.js");
const { Hbuy_msg } = require("./hbuy_msg.js");
const { Hlog } = require("../hlog/hlog.js");

class Hbuy {
	static MSG_TIMEOUT = 5000;
	static MSG_ID_LEN = 12;
	static TRANSACTION_ID_LEN = 8;

	net;
	res;
	status;

	FLAVOR_RES_EXEC = new Map([
		[Hbuy_msg.FLAVOR.TRANSACT, this._res_transact],
		[Hbuy_msg.FLAVOR.STATUS, this._res_status]
	]);

	constructor({net = null} = {}) {
		if (!(net instanceof Hbuy_net)) {
			throw new TypeError("Argument 'net' must be instance of Hbuy_net");
		}

		this.net = net;
		this.res = new EventEmitter();
		this.status = new EventEmitter();
	}

	_on_message(msg, rinfo) {
		if (msg.type === Hbuy_msg.TYPE.RES) {
			this.res.emit(msg.id.toString(), msg);
		} else {
			this._on_req(msg, rinfo);
		}
	}

	_transact_hook(req) {
		// Do nothing
	}

	_res_transact(req) {
		this._transact_hook(req);

		return new Hbuy_msg({
			from: "debug",
			data: "OK",
			type: Hbuy_msg.TYPE.RES,
			flavor: Hbuy_msg.FLAVOR.TRANSACT,
			id: req.id
		});
	}

	_res_status(req) {
		this.status.emit(`${req.data.id}#${req.data.code}`, req);

		return new Hbuy_msg({
			from: "debug",
			data: "OK",
			type: Hbuy_msg.TYPE.RES,
			flavor: Hbuy_msg.FLAVOR.STATUS,
			id: req.id
		});
	}

	_on_req(msg, rinfo) {
		Hlog.log(`[HBUY] Inbound ${Object.keys(Hbuy_msg.FLAVOR)[msg.flavor]} REQ from ${msg.from} (${rinfo.address}:${rinfo.port})`)
		const res = this.FLAVOR_RES_EXEC.get(msg.flavor).bind(this)(msg);
		this.send(res, rinfo.address, rinfo.port); // TODO: This is a good place to implement UDP retransmission
	}

	send(msg, addr, port, success, timeout) {
		if (msg.type === Hbuy_msg.TYPE.REQ) {
			const outgoing = new Promise((resolve, reject) => {
				const timeout_id = setTimeout(() => {
					this.res.removeAllListeners(msg.id.toString());
					reject();
				}, Hbuy.MSG_TIMEOUT);

				this.res.once(msg.id.toString(), (res_msg) => {
					clearTimeout(timeout_id);

					if (typeof success === "function") {
						success(res_msg, this);
					}

					resolve();
				});
			}).catch((reason) => {
				if (typeof timeout === "function") {
					timeout();
				}
			});
		}

		this.net._out(msg, {address: addr, port: port});	
	}

	start() {
		this.net.network.on("message", this._on_message.bind(this));
		Hlog.log(`[HBUY] Online`);
	}

	stop() {
		this.net.network.removeListener("message", this._on_message.bind(this));
		Hlog.log(`[HBUY] Offline`);
	}

	on_transact(f) {
		if (typeof f !== "function") {
			throw new TypeError("Argument 'f' must be a function");
		}

		this._transact_hook = f;
	}

	// Subscribe only once to the next status event for a given transaction ID and status code
	on_status(transact_id, status_code, cb) {
		this.status.once(`${transact_id.toString()}#${status_code}`, cb);
	}
}

module.exports.Hbuy = Hbuy;