/** 
* FSTUN
* STUN protocol (RFCs 5389 + 3489) implementation 
* 
* 
* 
* 
*/ 

"use strict";

const EventEmitter = require("events");
const { Fapp_env } = require("../fapp/fapp_env.js");
const { Fbigint } = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Flog } = require("../flog/flog.js");
const { Fstun_msg } = require("./fstun_msg.js");
const { Fstun_hdr } = require("./fstun_hdr.js");
const { Fstun_attr } = require("./fstun_attr.js");
const { Ftrans_rinfo } = require("../ftrans/ftrans_rinfo.js");

class Fstun {
  static REQ_TIMEOUT = 5000;

  net;
  sw;
  res;

  constructor({net = null, sw = false} = {}) {
    this.sw = sw;
    this.net = net;
    this.res = new EventEmitter();
    this.net.network.on("message", this._on_message.bind(this));
    Flog.log(`[FSTUN] Online`);
  }

  // TODO: This is the only client function we implement, but it kinda breaks our architectural 
  // pattern to handle state management with a Promise in here... do we need an eng module like FKAD?
  _binding_req(addr, port, pubkey) {
    return new Promise((resolve, reject) => {
      // TODO: figure out what we to do about retransmission if the transport layer doesn't do it

      const id_string = Fbigint.unsafe_random(Fstun_hdr.K_ID_LEN).toString(16);
      const id = Buffer.from(id_string, "hex");

      id.toString("hex");

      const req_hdr = new Fstun_hdr({
        type: Fstun_hdr.K_MSG_TYPE.BINDING_REQUEST,
        len: 0,
        id: id
      });

      const req_msg = new Fstun_msg({
        hdr: req_hdr
      });

      this._send(req_msg, new Ftrans_rinfo({address: addr, port: port, pubkey: pubkey}));

      const timeout_id = setTimeout(() => {
        this.res.removeAllListeners(id_string);
        resolve(null);
      }, Fstun.REQ_TIMEOUT);

      this.res.once(id_string, (res_msg) => {
        clearTimeout(timeout_id);
        resolve(res_msg);
      });
    });
  }

  _on_message(msg, rinfo) {
    const inMsg = Fstun_msg.from(msg);

    if (inMsg === null) {
      return;
    }

    Flog.log(`[FSTUN] Inbound ` +
      `${Object.keys(Fstun_hdr.K_MSG_TYPE)[Fstun_hdr._decType(inMsg.hdr.type).type]} ` +
      `from ${rinfo.address}:${rinfo.port}`);

    // For compliance with RFCs 5389 + 3489, return an error response for any unknown 
    // comprehension required attrs
    const badAttrTypes = [];

    inMsg.attrs.forEach((attr) => {
      if (Fstun_attr._decType(attr.type).type === Fstun_attr.K_ATTR_TYPE.MALFORMED && 
        Fstun_attr._isCompReq(attr.type)) {
        badAttrTypes.push(attr.type);
      }
    });

    if (badAttrTypes.length > 0) {
      const attrs = [
        new Fstun_attr({
          type: Fstun_attr.K_ATTR_TYPE.ERROR_CODE, 
          args: [420]
        }),
        new Fstun_attr({
          type: Fstun_attr.K_ATTR_TYPE.UNKNOWN_ATTRIBUTES, 
          args: [badAttrTypes]
        })
      ];

      const outHdr = new Fstun_hdr({
        type: Fstun_hdr.K_MSG_TYPE.BINDING_ERROR_RESPONSE, 
        len: Fstun_msg._attrByteLength(attrs), 
        id: inMsg.hdr.id
      });

      const outMsg = new Fstun_msg({
        hdr: outHdr, 
        attrs: attrs
      });

      this._send(outMsg, rinfo);
    }

    // TODO: We should have a Map of handler functions associated with their K_MSG_TYPE
    if (Fstun_hdr._decType(inMsg.hdr.type).type === Fstun_hdr.K_MSG_TYPE.BINDING_REQUEST) {
      const mtype = !inMsg.rfc3489 ? 
        Fstun_attr.K_ATTR_TYPE.XOR_MAPPED_ADDRESS : Fstun_attr.K_ATTR_TYPE.MAPPED_ADDRESS;

      const attrs = [
        new Fstun_attr({
          type: mtype, 
          args: [
            Fstun_attr.K_ADDR_FAMILY[rinfo.family], 
            rinfo.address, 
            rinfo.port, 
            !inMsg.rfc3489, 
            inMsg.hdr.id
          ]
        })
      ];

      if (this.sw) {
        attrs.push(new Fstun_attr({type: Fstun_attr.K_ATTR_TYPE.SOFTWARE}));
      }
      
      const outHdr = new Fstun_hdr({
        type: Fstun_hdr.K_MSG_TYPE.BINDING_SUCCESS_RESPONSE, 
        len: Fstun_msg._attrByteLength(attrs), 
        id: inMsg.hdr.id
      });

      const outMsg = new Fstun_msg({
        hdr: outHdr, 
        attrs: attrs
      });

      this._send(outMsg, rinfo);
    } else if (Fstun_hdr._decType(inMsg.hdr.type).type === 
        Fstun_hdr.K_MSG_TYPE.BINDING_SUCCESS_RESPONSE) {
      // TODO: confirm that this has the correct type attr, either XOR_MAPPED_ADDRESS or MAPPED_ADDRESS?
      const decoded = Fstun_attr._decMappedAddr(inMsg.attrs[0].val, inMsg.hdr.id, true);
      Flog.log(`[FSTUN] Binding response received: ${decoded[0]}:${decoded[1]}`)
      this.res.emit(inMsg.hdr.id.toString("hex"), decoded);
    }
  }

  _send(stunMsgObj, rinfo) {
    this.net._out(stunMsgObj.serialize(), rinfo);
  }
}

module.exports.Fstun = Fstun;