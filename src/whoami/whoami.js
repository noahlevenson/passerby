"use strict";

const Journal = require("../core/journal.js");
const { Bigboy } = require("../core/types/bigboy.js");
const { Io } = require("../protocol/io.js");
const Codec = require("../protocol/codec.js");
const { Header } = require("./header.js");
const { Message } = require("./message.js");
const { Attribute } = require("./attribute.js");

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

      this.send({
        body: new Message({hdr: req_hdr}).serialize(),
        body_type: Codec.BODY_TYPE.BINARY,
        rinfo: rinfo,
        gen: this.generator(),
        success: () => {
          resolve()
        },
        timeout: () => {
          reject()
        }
      });
    });
  }

  // body must be a Uint8Array, encoded and decoded by the Codec as binary type data
  on_message(gen, body, rinfo) {
    super.on_message(gen, body, rinfo);
    const inMsg = Message.from(body);

    if (inMsg === null) {
      return;
    }

    Journal.log(Whoami.TAG, `Inbound ` +
      `${Object.keys(Header.MSG_TYPE)[Header._decType(inMsg.hdr.type).type]} ` +
      `from ${rinfo.address}:${rinfo.port}`);

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
    Journal.log(Whoami.TAG, `Binding response received: ${addr}:${port}`)
  }
}

module.exports = { Whoami };