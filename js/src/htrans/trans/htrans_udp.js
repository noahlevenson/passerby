/** 
* HTRANS_UDP
* An HTRANS module that sends and receives over UDP
* 
* 
* 
* 
*/ 

"use strict";

const dgram = require("dgram");
const EventEmitter = require("events");
const { Happ_env } = require("../../happ/happ_env.js");
const { Hlog } = require("../../hlog/hlog.js");
const { Htrans } = require("./htrans.js");
const { Htrans_msg } = require("../htrans_msg.js");
const { Hutil } = require("../../hutil/hutil.js");
const { Hbigint } = Happ_env.BROWSER ? require("../../htypes/hbigint/hbigint_browser.js") : require("../../htypes/hbigint/hbigint_node.js");

class Htrans_udp extends Htrans {
	static RETRANSMIT = true;
	static MAX_RETRIES = 5;
	static DEFAULT_RTT_MS = 100;
	static BACKOFF_FUNC = x => x * 2;
	static ID_LEN = 8;

	socket;
	port;
	udp4;
	udp6;
	ack;

	// TODO: we need to have a deep think about whether mixed IPv4 + IPv6 networks will work correctly
	// until then, we disable UPD6 by default
	constructor({port = 27500, udp4 = true, udp6 = false} = {}) {
		super();
		this.port = port;
		this.udp4 = udp4;
		this.udp6 = udp6;
		this.ack = new EventEmitter();
	}

	async _start() {
		if (this.udp4 && this.udp6) {
			this.socket = dgram.createSocket("udp6");
		} else if (this.udp4) {
			this.socket = dgram.createSocket("udp4");
		} else {
			this.socket = dgram.createSocket({type: "udp6", ipv6Only: true});
		}

		this.socket.on("message", this._on_message.bind(this));
		this.socket.bind(this.port);
		Hlog.log(`[HTRANS] UDP service starting on port ${this.port}, retranmission ${Htrans_udp.RETRANSMIT ? "enabled" : "disabled"}...`);
		await this._listening();
	}

	_stop() {
		this.socket.on("close", () => {
			Hlog.log(`[HTRANS] UDP service stopped`);
		});

		this.socket.close();
	}

	_listening() {
		return new Promise((resolve, reject) => {
			this.socket.on("listening", () => {
				const addr = this.socket.address();
				Hlog.log(`[HTRANS] UDP service online, listening on ${addr.address}:${addr.port}`);		
				resolve();
			});
		});
	}

	_on_message(msg, rinfo) {
		// The message here is a Buffer containing an Htrans_msg, delivered raw from the UDP socket
		// TODO: Discern between a valid Htrans_msg and some garbage/malicious data!
		const in_msg = new Htrans_msg(JSON.parse(msg.toString(), Hbigint._json_revive)); // this is nice! We rehydrate our Hbigints at the HTRANS layer, which is exactly where we should do it

		// We're in retransmit mode and someone sent us an ACK, so just fire the event for this ACK and be done
		if (Htrans_udp.RETRANSMIT && in_msg.type === Htrans_msg.TYPE.ACK) {
			this.ack.emit(in_msg.id.toString(), in_msg);
			return;
		} 

		// We're in retransmit mode and someone sent us a regular message, so send them an ACK with no possibility of retransmission and continue to process the message
		if (Htrans_udp.RETRANSMIT) {
			const ack = new Htrans_msg({
				type: Htrans_msg.TYPE.ACK,
				id: in_msg.id
			});

			this._do_send(Buffer.from(JSON.stringify(ack)), rinfo.address, rinfo.port);
		}

		this.network.emit("message", in_msg, rinfo);
	}

	_do_send(buf, addr, port, cb = () => {}) {
		this.socket.send(buf, 0, buf.length, port, addr, (err) => {
			if (err) {
				Hlog.log(`[HTRANS] UDP socket send error ${addr}:${port} (${err})`);
				return;
			}

			cb();
		});
	}

	_send(htrans_msg, addr, port) {
		if (Htrans_udp.RETRANSMIT) {
			htrans_msg.id = Hbigint.random(Htrans_udp.ID_LEN);
		}

		// htrans_msg is delivered from any module, and it's assumed that its msg field is a buffer
		const buf = Buffer.from(JSON.stringify(htrans_msg));
		
		this._do_send(buf, addr, port, () => {
			let timeout_id = null;

			function _retry_runner(lambda, i, max_retries, delay, backoff_func, end_cb) {
				if (i > max_retries) {
					end_cb();
					Hlog.log(`[HTRANS] Retransmitted msg # ${htrans_msg.id.toString()} ${max_retries} times, giving up!`);
					return;
				}

				timeout_id = setTimeout(() => {
					console.log("RESENDING NOW")
					lambda();
					delay = backoff_func(delay);
					i += 1;
					_retry_runner.bind(this, lambda, i, max_retries, delay, backoff_func, end_cb);
				}, delay);
			}

			if (Htrans_udp.RETRANSMIT) {
				console.log("AYYY")
				this.ack.once(htrans_msg.id.toString(), (res_msg) => {
					console.log("HEARD AN ACK")
					// clearTimeout(timeout_id);
				});

				_retry_runner(this._do_send.bind(this, buf, addr, port), 0, Htrans_udp.MAX_RETRIES, Htrans_udp.DEFAULT_RTT_MS, Htrans_udp.BACKOFF_FUNC, () => {
					this.ack.removeAllListeners(htrans_msg.id.toString());
				});
			}
		});
	}
}

module.exports.Htrans_udp = Htrans_udp;