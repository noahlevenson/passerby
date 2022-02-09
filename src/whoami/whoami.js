"use strict";

const Journal = require("../core/journal.js");
const { Bigboy } = require("../core/types/bigboy.js");
const { Io } = require("../protocol/io.js");
const Codec = require("../protocol/codec.js");
const { Header } = require("./header.js");
const { Message } = require("./message.js");
const { Attribute } = require("./attribute.js");

/**
 * TODO: Whoami is intended to be a generalized NAT traversal protocol, somewhat like libp2p's 
 * Identify. Currently, it's just a thin wrapper over an implementation of STUN. It was originally 
 * ported over from ministun (https://github.com/noahlevenson/ministun), and it still bears code
 * style from that project which is inconsistent here. A notable inconsistency is the use of 
 * camelcase instead of snake case. In general, this module could use a redesign and a more 
 * thoughtful approach to modularization...
 */ 

class Whoami extends Io {
  static TAG = "WHOM";

  MSG_HANDLER = new Map([
    [Header.MSG_TYPE.BINDING_REQUEST, this._res_binding],
    [Header.MSG_TYPE.BINDING_SUCCESS_RESPONSE, this._res_binding_success]
  ]);

  constructor(bus, generator, sw = false) {
    super({bus: bus, generator: generator, type: Codec.MSG_TYPE.WHOAMI});
    this.sw = sw;
  }

  ask(rinfo) {
    return new Promise((resolve, reject) => {
      const id = Bigboy.unsafe_random(Header.ID_LEN);

      const req_hdr = new Header({
        type: Header.MSG_TYPE.BINDING_REQUEST,
        len: 0,
        id: id._data
      });

      Journal.log(Whoami.TAG, `STUN binding request -> ${rinfo.address}:${rinfo.port}`);

      this.send({
        body: new Message({hdr: req_hdr}).serialize(),
        body_type: Codec.BODY_TYPE.BINARY,
        rinfo: rinfo,
        gen: this.generator(),
        success: (gen, body) => {
          const msg = Message.from(body);
          resolve(Attribute._decMappedAddr(msg.attrs[0].val, msg.hdr.id, true));
        },
        timeout: () => {
          reject(null);
        }
      });
    });
  }

  on_message(gen, body, rinfo) {
    super.on_message(gen, body, rinfo);
    const inMsg = Message.from(body);

    if (inMsg === null) {
      return;
    }


    /**
     * For compliance with RFCs 5389 and 3489, return an error response for any unknown 
     * comprehension required attributes
     */ 
    const badAttrTypes = [];

    inMsg.attrs.forEach((attr) => {
      if (Attribute._decType(attr.type).type === Attribute.ATTR_TYPE.MALFORMED && 
        Attribute._isCompReq(attr.type)) {
        badAttrTypes.push(attr.type);
      }
    });

    if (badAttrTypes.length > 0) {
      const attrs = [
        new Attribute({
          type: Attribute.ATTR_TYPE.ERROR_CODE, 
          args: [420]
        }),
        new Attribute({
          type: Attribute.ATTR_TYPE.UNKNOWN_ATTRIBUTES, 
          args: [badAttrTypes]
        })
      ];

      const outHdr = new Header({
        type: Header.MSG_TYPE.BINDING_ERROR_RESPONSE, 
        len: Message._attrByteLength(attrs), 
        id: inMsg.hdr.id
      });

      const outMsg = new Message({
        hdr: outHdr, 
        attrs: attrs
      });

      this.send({
        body: outMsg.serialize(),
        body_type: Codec.BODY_TYPE.BINARY,
        rinfo: rinfo,
        gen: this.generator()
      });
    }

    const handler = this.MSG_HANDLER.get(Header._decType(inMsg.hdr.type).type);

    if (handler) {
      handler.bind(this)(gen, inMsg, rinfo);
    }
  }

  _res_binding(gen, inMsg, rinfo) {
    const mtype = !inMsg.rfc3489 ? 
      Attribute.ATTR_TYPE.XOR_MAPPED_ADDRESS : Attribute.ATTR_TYPE.MAPPED_ADDRESS;

    const attrs = [
      new Attribute({
        type: mtype, 
        args: [
          Attribute.ADDR_FAMILY[rinfo.family], 
          rinfo.address, 
          rinfo.port, 
          !inMsg.rfc3489, 
          inMsg.hdr.id
        ]
      })
    ];

    if (this.sw) {
      attrs.push(new Attribute({type: Attribute.ATTR_TYPE.SOFTWARE}));
    }
    
    const outHdr = new Header({
      type: Header.MSG_TYPE.BINDING_SUCCESS_RESPONSE, 
      len: Message._attrByteLength(attrs), 
      id: inMsg.hdr.id
    });

    this.send({
      body: new Message({hdr: outHdr, attrs: attrs}).serialize(),
      body_type: Codec.BODY_TYPE.BINARY,
      rinfo: rinfo,
      gen: Codec.get_gen_res(gen)
    });
  }

  _res_binding_success(gen, inMsg, rinfo) {
    // TODO: confirm that this has the correct type attr, either XOR_MAPPED_ADDRESS or MAPPED_ADDRESS?
    const [addr, port] = Attribute._decMappedAddr(inMsg.attrs[0].val, inMsg.hdr.id, true);
    Journal.log(Whoami.TAG, `${addr}:${port} <- STUN binding success`);
  }
}

module.exports = { Whoami };