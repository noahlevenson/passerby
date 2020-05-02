const dgram = require("dgram");
const { Htrans } = require("../htrans.js");
const { Htrans_msg } = require("../htrans_msg.js");

// Htrans_udp is our UDP transport service
class Htrans_udp extends Htrans {
	prefix;
	socket;
	port;
	udp4;
	udp6;

	constructor({port = 27500, udp4 = true, udp6 = true} = {}) {
		super();
		this.prefix = "+udp";
		this.port = port;
		this.udp4 = udp4;
		this.udp6 = udp6;
		this.inbound_event_name = `${this.prefix}${this.port}`;
		this._start();
	}

	// This should prob be promise based
	_start() {
		if (this.udp4 && this.udp6) {
			this.socket = dgram.createSocket("udp6");
		} else if (this.udp4) {
			this.socket = dgram.createSocket("udp4");
		} else {
			this.socket = dgram.createSocket({type: "udp6", ipv6Only: true});
		}

		this.socket.on("listening", () => {
			const addr = this.socket.address();
			console.log(`[HTRANS] UDP service listening on ${addr.address}:${addr.port}`);
		});

		this.socket.on("message", this._on_message.bind(this));
		this.socket.bind(this.port);
		console.log(`[HTRANS] UDP service starting...`);
	}

	_on_message(msg, rinfo) {
		// The message here is a Buffer, delivered raw from the UDP socket
		const in_msg = new Htrans_msg({
			msg: Buffer.from(msg), // Maybe it's not necessary to copy it?
			addr: rinfo.address,
			fam: rinfo.family,
			port: rinfo.port,
			size: rinfo.size
		});

		this.network.emit(this.inbound_event_name, in_msg);
	}

	_send(htrans_msg) {
		// htrans_msg is delivered from any module, and it's assumed that its msg field is a buffer

		this.socket.send(htrans_msg.msg, htrans_msg.port, htrans_msg.addr, (err) => {
			if (err) {
				console.log(`[HTRANS] UDP socket send error ${htrans_msg.addr}:${htrans_msg.port} (${err})`);
				return;
			}

			// console.log(`[HTRANS] UDP outbound to ${htrans_msg.addr}:${htrans_msg.port}`);
		});
	}
}

module.exports.Htrans_udp = Htrans_udp;