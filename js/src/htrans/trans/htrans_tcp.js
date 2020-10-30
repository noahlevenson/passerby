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
		this.server = null;
	}

	_start() {
		return new Promise((resolve, reject) => {
			this.server = net.createServer((connection) => {
				connection.on("data", this._on_message.bind(this));
			});

			this.server.listen(this.port, () => {
				const addr = this.server.address();
				Hlog.log(`[HTRANS] TCP service online, listening on ${addr.address}:${addr.port}`);
				resolve();
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

		const s = net.createConnection(port, addr, () => {
			s.write(buf, () => {
				s.end();
			});
		});

		s.on("error", (err) => {
			Hlog.log(`[HTRANS] TCP send error: ${err.message}`);
		});
	}
}

module.exports.Htrans_tcp = Htrans_tcp;