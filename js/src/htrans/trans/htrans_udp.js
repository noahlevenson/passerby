const dgram = require("dgram");
const { Htrans } = require("../htrans.js");
const { Htrans_msg } = require("../htrans_msg.js");
const { Hutil } = require("../../hutil/hutil.js");

// Htrans_udp is our UDP transport service
class Htrans_udp extends Htrans {
	socket;
	port;
	udp4;
	udp6;

	constructor({port = 27500, udp4 = true, udp6 = true} = {}) {
		super();
		this.port = port;
		this.udp4 = udp4;
		this.udp6 = udp6;
	}

	// This should prob be promise based, i want to await this
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
		console.log(`[HTRANS] UDP service starting on port ${this.port}...`);
		await this._listening();

	}

	_listening() {
		return new Promise((resolve, reject) => {
			this.socket.on("listening", () => {
				const addr = this.socket.address();
				console.log(`[HTRANS] UDP service online, listening on ${addr.address}:${addr.port}`);
				resolve();
			});
		});
	}

	_on_message(msg, rinfo) {
		// The message here is a Buffer containing an Htrans_msg, delivered raw from the UDP socket
		// TODO: Discern between a valid Htrans_msg and some garbage/malicious data!
		const in_msg = new Htrans_msg(JSON.parse(msg.toString(), Hutil._bigint_revive)); // this is nice! We rehydrate our BigInts at the HTRANS layer, which is exactly where we should do it
		this.network.emit("message", in_msg);
	}

	_send(htrans_msg, addr, port) {
		// htrans_msg is delivered from any module, and it's assumed that its msg field is a buffer
		this.socket.send(Buffer.from(JSON.stringify(htrans_msg)), port, addr, (err) => {
			if (err) {
				console.log(`[HTRANS] UDP socket send error ${addr}:${port} (${err})`);
				return;
			}

			// console.log(`[HTRANS] UDP outbound to ${htrans_msg.addr}:${htrans_msg.port}`);
		});
	}
}

module.exports.Htrans_udp = Htrans_udp;