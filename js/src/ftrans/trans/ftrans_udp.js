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
const { Fid } = require("../../fid/fid.js"); 
const { Flog } = require("../../flog/flog.js");
const { Ftrans } = require("./ftrans.js");
const { Ftrans_msg } = require("../ftrans_msg.js");
const { Ftrans_rinfo } = require("../ftrans_rinfo.js");
const { Futil } = require("../../futil/futil.js");
const { Fbigint } = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? require("../../ftypes/fbigint/fbigint_rn.js") : require("../../ftypes/fbigint/fbigint_node.js");

class Ftrans_udp extends Ftrans {
	static RETRANSMIT = true;
	static MAX_RETRIES = 7;
	static DEFAULT_RTT_MS = 200;
	static BACKOFF_FUNC = x => x * 2;

	socket;
	port;
	pubkey;
	udp4;
	udp6;
	ack;

	// TODO: we need to have a deep think about whether mixed IPv4 + IPv6 networks will work correctly
	// until then, we disable UPD6 by default
	constructor({port = 27500, pubkey = null, udp4 = true, udp6 = false} = {}) {
		super();
		this.port = port;
		this.pubkey = Buffer.from(pubkey, "hex");
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

	async _on_message(msg, rinfo) {
		// The message here is a Buffer representing an Ftrans_msg, delivered raw from the UDP socket
		// TODO: Discern between a valid Ftrans_msg and some garbage/malicious data!
		const in_msg = new Ftrans_msg(JSON.parse(msg.toString()));

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

		// *** DECRYPTION
		try {	
			// TODO: Add a reviver for Buffers so we don't have to do this nooblife Buffer rehydration here
			const privkey = await Fid.get_privkey();
			const one_time_key = await Fid.private_decrypt(Buffer.from(in_msg.key.data), privkey);
			const decrypted_msg = await Fid.symmetric_decrypt(Buffer.from(in_msg.msg.data), one_time_key, Buffer.from(in_msg.iv.data));
			const valid_sig = await Fid.verify(decrypted_msg, Buffer.from(in_msg.pubkey), Buffer.from(in_msg.sig.data));

			if (!valid_sig) {
				throw new Error();
			} 

			in_msg.msg = JSON.parse(decrypted_msg.toString(), Fbigint._json_revive);
		} catch(err) {
			return;
		}
		// *** END DECRYPTION

		this.network.emit("message", in_msg, new Ftrans_rinfo({address: rinfo.address, port: rinfo.port, family: rinfo.family, pubkey: in_msg.pubkey}));
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

	async _send(ftrans_msg, ftrans_rinfo) {
		// The Ftrans_msg 'id' property isn't used by default, though Ftrans subclasses may optionally utilize it
		// Ftrans_udp uses it for UDP retransmission, so let's ensure that higher level modules aren't populating that field
		if (ftrans_msg.id !== null) {
			throw new Error("Ftrans_msg IDs should be null");
		}
	
		if (Ftrans_udp.RETRANSMIT) {
			ftrans_msg.id = Fbigint.unsafe_random(Ftrans_msg.ID_LEN);
		}

		// *** ENCRYPTION
		// ftrans_msg is delivered from any module - its msg field is an object
		// We need to sign the msg, add the sig to the ftrans_msg, generate a one-time symmetric key and one-time iv, 
		// encrypt the msg and one time key for its recipient and add our pubkey and the iv
		const privkey = await Fid.get_privkey();
		const msg_buf = Buffer.from(JSON.stringify(ftrans_msg.msg));
		ftrans_msg.sig = await Fid.sign(msg_buf, privkey);
		const one_time_key = await Fid.generate_one_time_key();
		ftrans_msg.iv = await Fid.generate_one_time_iv();
		ftrans_msg.msg = await Fid.symmetric_encrypt(msg_buf, one_time_key, ftrans_msg.iv);
		ftrans_msg.key = await Fid.public_encrypt(one_time_key, ftrans_rinfo.pubkey);
		ftrans_msg.pubkey = this.pubkey;
		const buf = Buffer.from(JSON.stringify(ftrans_msg));
		// *** END ENCRYPTION

		this._do_send(buf, ftrans_rinfo.address, ftrans_rinfo.port, () => {
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

				_retry_runner(this._do_send.bind(this, buf, ftrans_rinfo.address, ftrans_rinfo.port), 0, Ftrans_udp.MAX_RETRIES, Ftrans_udp.DEFAULT_RTT_MS, Ftrans_udp.BACKOFF_FUNC, () => {
					this.ack.removeAllListeners(ftrans_msg.id.toString());
				});
			}
		});
	}
}

module.exports.Ftrans_udp = Ftrans_udp;