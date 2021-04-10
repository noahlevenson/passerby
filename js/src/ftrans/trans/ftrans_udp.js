/** 
* FTRANS_UDP
* An FTRANS module that sends and receives over UDP
* 
* 
* 
* 
*/ 

"use strict";

const { Fapp_env } = require("../../fapp/fapp_env.js");
const dgram = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? require("react-native-udp").default : require("dgram");
const EventEmitter = require("events");
const { Flog } = require("../../flog/flog.js");
const { Ftrans } = require("./ftrans.js");
const { Ftrans_msg } = require("../ftrans_msg.js");
const { Futil } = require("../../futil/futil.js");
const { Fbigint } = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? require("../../ftypes/fbigint/fbigint_rn.js") : require("../../ftypes/fbigint/fbigint_node.js");

class Ftrans_udp extends Ftrans {
	static RETRANSMIT = true;
	static MAX_RETRIES = 7;
	static DEFAULT_RTT_MS = 200;
	static BACKOFF_FUNC = x => x * 2;

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
		Flog.log(`[FTRANS] UDP service starting on port ${this.port}, retransmission ${Ftrans_udp.RETRANSMIT ? "enabled" : "disabled"}...`);
		await this._listening();
	}

	_stop() {
		this.socket.on("close", () => {
			Flog.log(`[FTRANS] UDP service stopped`);
		});

		this.socket.close();
	}

	_listening() {
		return new Promise((resolve, reject) => {
			this.socket.on("listening", () => {
				const addr = this.socket.address();
				Flog.log(`[FTRANS] UDP service online, listening on ${addr.address}:${addr.port}`);		
				resolve();
			});
		});
	}

	_on_message(msg, rinfo) {
		// The message here is a Buffer containing an Ftrans_msg, delivered raw from the UDP socket
		// TODO: Discern between a valid Ftrans_msg and some garbage/malicious data!
		const in_msg = new Ftrans_msg(JSON.parse(msg.toString(), Fbigint._json_revive)); // this is nice! We rehydrate our Fbigints at the FTRANS layer, which is exactly where we should do it

		// We're in retransmit mode and the incoming msg is an ACK, so just fire the event to announce this ACK and be done
		if (Ftrans_udp.RETRANSMIT && in_msg.type === Ftrans_msg.TYPE.ACK) {
			this.ack.emit(in_msg.id.toString(), in_msg);
			return;
		} 

		// We're in retransmit mode and someone sent us a regular msg, so send them an ACK (with no possibility of retransmitting the ACK!) and continue to process their message
		if (Ftrans_udp.RETRANSMIT) {
			const ack = new Ftrans_msg({
				type: Ftrans_msg.TYPE.ACK,
				id: in_msg.id
			});

			this._do_send(Buffer.from(JSON.stringify(ack)), rinfo.address, rinfo.port);
		}

		this.network.emit("message", in_msg, rinfo);
	}

	_do_send(buf, addr, port, cb = () => {}) {
		this.socket.send(buf, 0, buf.length, port, addr, (err) => {
			if (err) {
				Flog.log(`[FTRANS] UDP socket send error ${addr}:${port} (${err})`);
				return;
			}

			cb();
		});
	}

	_send(ftrans_msg, addr, port) {
		// The Ftrans_msg 'id' property isn't used by default, though Ftrans subclasses may optionally utilize it
		// Ftrans_udp uses it for UDP retransmission, so let's ensure that higher level modules aren't populating that field
		if (ftrans_msg.id !== null) {
			throw new Error("Ftrans_msg IDs should be null");
		}
	
		if (Ftrans_udp.RETRANSMIT) {
			ftrans_msg.id = Fbigint.unsafe_random(Ftrans_msg.ID_LEN);
		}

		// ftrans_msg is delivered from any module, and it's assumed that its msg field is a buffer
		const buf = Buffer.from(JSON.stringify(ftrans_msg));

		this._do_send(buf, addr, port, () => {
			let timeout_id = null;

			function _retry_runner(f, i, max_retries, delay, backoff_f, end_cb) {
				if (i === max_retries) {
					end_cb();
					Flog.log(`[FTRANS] Retransmitted msg # ${ftrans_msg.id.toString()} ${max_retries} times, giving up!`);
					return;
				}

				timeout_id = setTimeout(() => {
					Flog.log(`[FTRANS] No UDP ACK for msg # ${ftrans_msg.id}, retransmitting ${i + 1}/${max_retries}`)
					f();
					_retry_runner(f, i + 1, max_retries, backoff_f(delay), backoff_f, end_cb);
				}, delay);
			}

			if (Ftrans_udp.RETRANSMIT) {
				this.ack.once(ftrans_msg.id.toString(), (res_msg) => {
					clearTimeout(timeout_id);
				});

				_retry_runner(this._do_send.bind(this, buf, addr, port), 0, Ftrans_udp.MAX_RETRIES, Ftrans_udp.DEFAULT_RTT_MS, Ftrans_udp.BACKOFF_FUNC, () => {
					this.ack.removeAllListeners(ftrans_msg.id.toString());
				});
			}
		});
	}
}

module.exports.Ftrans_udp = Ftrans_udp;