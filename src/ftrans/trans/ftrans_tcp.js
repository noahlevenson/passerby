/** 
* FTRANS_TCP
* TCP transport
* 
* 
* 
* 
*/ 

"use strict";

const { Fapp_cfg } = require("../../fapp/fapp_cfg.js");
const cfg = require("../../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../../ftypes/fbigint/fbigint_rn.js") : require("../../ftypes/fbigint/fbigint_node.js");
const { Ftrans_msg } = require("../ftrans_msg.js");
const { Ftrans_rinfo } = require("../ftrans_rinfo.js");
const { Flog } = require("../../flog/flog.js");
const { Ftrans } = require("./ftrans.js");
const net = require("net");

class Ftrans_tcp extends Ftrans {
  port;
  server;
  connections;
  pubkey;
  
  constructor({port = 27500, pubkey = null} = {}) {
    super();
    this.port = port;
    this.server = null;
    this.pubkey = pubkey;
    this.connections = new Map();
  }

  _start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((connection) => {
        connection.on("data", (msg) => {
          this._on_network(msg, {
            address: connection.remoteAddress, 
            port: connection.remotePort, 
            family: connection.remoteFamily
          });
        });
      });

      this.server.listen({port: this.port, host: "0.0.0.0"}, () => {
        const addr = this.server.address();
        Flog.log(`[FTRANS] TCP service online, listening on ${addr.address}:${addr.port}`);
        resolve();
      });
    });
  }

  async _on_network(msg, rinfo) {
    const in_msg = new Ftrans_msg(JSON.parse(msg.toString(), Fbigint._json_revive));
    const decrypted_msg = await Ftrans_msg.decrypted_from(in_msg);

    this.network.emit("message", decrypted_msg, new Ftrans_rinfo({
      address: rinfo.address,
      port: rinfo.port,
      family: rinfo.family,
      pubkey: decrypted_msg.pubkey
    }));
  }

  async _send(msg, ftrans_rinfo) {
    const ftrans_msg = await Ftrans_msg.encrypted_from({
      msg: msg,
      type: Ftrans_msg.get_msg_type(msg),
      sender_pubkey: this.pubkey, 
      recip_pubkey: ftrans_rinfo.pubkey
    });
    
    const buf = Buffer.from(JSON.stringify(ftrans_msg));
    const socket = this.connections.get(JSON.stringify(ftrans_rinfo));

    if (socket) {
      socket.write(buf);
    } else {
      const new_socket = net.createConnection({
        port: ftrans_rinfo.port,
        host: ftrans_rinfo.address
      }, () => {
        new_socket.write(buf, () => {
          // TODO: lol we currently keep connections open forever
          // new_socket.end();
        });
      });

      new_socket.on("error", err => Flog.log(`[FTRANS] TCP send error: ${err.message}`);
      this.connections.set(JSON.stringify(ftrans_rinfo));
    }
  }
}

module.exports.Ftrans_tcp = Ftrans_tcp;