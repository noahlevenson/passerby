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
const { Hid_pub } = require("../hid/hid_pub.js");
const { Hbuy_net } = require("./net/hbuy_net.js");
const { Hbuy_msg } = require("./hbuy_msg.js");
const { Hbuy_sms } = require("./hbuy_sms.js");
const { Hbuy_tsact } = require("./hbuy_tsact.js");
const { Hbuy_status } = require("./hbuy_status.js");
const { Hlog } = require("../hlog/hlog.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

class Hbuy {
	static MSG_TIMEOUT = 5000;
	
	net;
	hid_pub;
	res;
	status;

	FLAVOR_RES_EXEC = new Map([
		[Hbuy_msg.FLAVOR.TRANSACT, this._res_transact],
		[Hbuy_msg.FLAVOR.STATUS, this._res_status],
		[Hbuy_msg.FLAVOR.SMS, this._res_sms]
	]);

	constructor({net = null, hid_pub = null} = {}) {
		if (!(net instanceof Hbuy_net)) {
			throw new TypeError("Argument 'net' must be instance of Hbuy_net");
		}

		if (!(hid_pub instanceof Hid_pub)) {
			throw new TypeError("Argument 'hid_pub' must be instance of Hid_pub");
		}

		this.net = net;
		this.hid_pub = hid_pub;
		this.res = new EventEmitter();
		this.status = new EventEmitter();
	}

	_on_message(msg, rinfo) {
		if (msg.type === Hbuy_msg.TYPE.RES) {
			Hlog.log(`[HBUY] ${Object.keys(Hbuy_msg.FLAVOR)[msg.flavor]} REQ # ${msg.data.id ? msg.data.id.toString() : msg.id.toString()} OK`);
			this.res.emit(msg.id.toString(), msg);
		} else {
			this._on_req(msg, rinfo);
		}
	}

	_transact_hook(req, rinfo) {
		// Do nothing
	}

	_res_transact(req, rinfo) {
		this._transact_hook(req, rinfo);

		return new Hbuy_msg({
			data: new Hbuy_tsact({order: null, pment: null, id: req.data.id}),
			type: Hbuy_msg.TYPE.RES,
			flavor: Hbuy_msg.FLAVOR.TRANSACT,
			id: req.id
		});
	}

	_sms_hook(req, rinfo) {
		// Do nothing
	}

	_res_sms(req, rinfo) {
		this._sms_hook(req, rinfo);

		return new Hbuy_msg({
			data: new Hbuy_sms({from: this.hid_pub}),
			type: Hbuy_msg.TYPE.RES,
			flavor: Hbuy_msg.FLAVOR.SMS,
			id: req.id
		});
	}

	_res_status(req, rinfo) {
		this.status.emit(`${req.data.id}#${req.data.code}`, req);

		return new Hbuy_msg({
			data: new Hbuy_status({id: req.data.id, code: req.data.code}),
			type: Hbuy_msg.TYPE.RES,
			flavor: Hbuy_msg.FLAVOR.STATUS,
			id: req.id
		});
	}

	_on_req(msg, rinfo) {
		Hlog.log(`[HBUY] Inbound ${Object.keys(Hbuy_msg.FLAVOR)[msg.flavor]} REQ from ${rinfo.address}:${rinfo.port}`)
		const res = this.FLAVOR_RES_EXEC.get(msg.flavor).bind(this)(msg, rinfo);
		this._send(res, rinfo.address, rinfo.port); // TODO: This is a good place to implement UDP retransmission
	}

	_send(msg, addr, port, success, timeout) {
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
					timeout(msg);
				}
			});
		}	

		Hlog.log(`[HBUY] Outbound ${Object.keys(Hbuy_msg.FLAVOR)[msg.flavor]} ${Object.keys(Hbuy_msg.TYPE)[msg.type]} # ${msg.data.id ? msg.data.id.toString() : msg.id.toString()} to ${addr}:${port}`);
		this.net._out(msg, {address: addr, port: port});	
	}

	// Create and send a transaction request, return the transaction ID
	transact_req({hbuy_transaction = null, addr = null, port = null, success = () => {}, timeout = () => {}} = {}) {
		// For sanity during development, explicitly require arguments
		if (hbuy_transaction === null || addr === null || port === null) {
			throw new TypeError("Arguments cannot be null");
		}

		const msg = new Hbuy_msg({
			data: hbuy_transaction,
			type: Hbuy_msg.TYPE.REQ,
			flavor: Hbuy_msg.FLAVOR.TRANSACT,
			id: Hbigint.random(Hbuy_msg.ID_LEN)
		});

		this._send(msg, addr, port, success, timeout);
	}

	// TODO: this should be refactored to work like transact_req above -- don't construct the Hbuy_status, just send it
	status_req({id = null, code = null, addr = null, port = null, success = () => {}, timeout = () => {}} = {}) {
		// For sanity during development, explicitly require arguments
		if (id === null || code === null || addr === null || port === null) {
			throw new TypeError("Arguments cannot be null");
		}

		const status = new Hbuy_status({
			id: id,
			code: code
		});

		const msg = new Hbuy_msg({
			data: status,
			type: Hbuy_msg.TYPE.REQ,
			flavor: Hbuy_msg.FLAVOR.STATUS,
			id: Hbigint.random(Hbuy_msg.ID_LEN)
		});

		this._send(msg, addr, port, success, timeout);
	}


	sms_req({hbuy_sms = null, addr = null, port = null, success = () => {}, timeout = () => {}} = {}) {
		// For sanity during development, explicitly require arguments
		if (hbuy_sms === null || addr === null || port === null) {
			throw new TypeError("Arguments cannot be null");
		}

		const msg = new Hbuy_msg({
			data: hbuy_sms,
			type: Hbuy_msg.TYPE.REQ,
			flavor: Hbuy_msg.FLAVOR.SMS,
			id: Hbigint.random(Hbuy_msg.ID_LEN)
		});

		this._send(msg, addr, port, success, timeout);
		return sms;
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

	on_sms(f) {
		if (typeof f !== "function") {
			throw new TypeError("Argument 'f' must be a function");
		}

		this._sms_hook = f;
	}

	// Subscribe only once to the next status event for a given transaction ID and status code
	on_status(transact_id, status_code, cb) {
		this.status.once(`${transact_id.toString()}#${status_code}`, cb);
	}
}

module.exports.Hbuy = Hbuy;
