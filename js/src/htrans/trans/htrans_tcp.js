/** 
* HTRANS_UDP
* An HTRANS module that sends and receives over TCP
* 
* 
* 
* 
*/ 

"use strict";

const net = require("net");
const { Happ_env } = require("../../happ/happ_env.js");
const { Hlog } = require("../../hlog/hlog.js");
const { Htrans } = require("./htrans.js");
const { Htrans_msg } = require("../htrans_msg.js");
const { Hbigint } = Happ_env.BROWSER ? require("../../htypes/hbigint/hbigint_browser.js") : require("../../htypes/hbigint/hbigint_node.js");

class Htrans_tcp extends Htrans {
	port;
	server;

	constructor({port = 27500} = {}) {
		super();
		this.port = port;
	}

	async _start() {
		this.server = net.createServer();
		this.server.listen(this.port, this._listening);
	}

	_listening() {
		const addr = this.server.address();
		Hlog.log(`[HTRANS] TCP service online, listening on ${addr.address}:${addr.port}`);		

		this.server.on("connection", (socket) => {
			socket.on("data", (msg) => {
				this._on_message(msg, {address: socket.remoteAddress, port: socket.remotePort});
			});
		});
	}

	_on_message(msg, rinfo) {
		const in_msg = new Htrans_msg(JSON.parse(msg.toString(), Hbigint._json_revive));
		this.network.emit("message", in_msg, rinfo);

		console.log(rinfo);
		console.log(in_msg);
	}

	_send(htrans_msg, addr, port) {
		const buf = Buffer.from(JSON.stringify(htrans_msg));

		const s = net.createConnection(port, addr, (err) => {
			if (err) {
				Hlog.log(`[HTRANS] TCP send error ${addr}:${port} (${err})`);
				return;
			}

			s.write(buf, (err) => {
				if (err) {
					Hlog.log(`[HTRANS] TCP send error ${addr}:${port} (${err})`);
				}

				s.end();
			});
		});
	}
}

module.exports.Htrans_tcp = Htrans_tcp;