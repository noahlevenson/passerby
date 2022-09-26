"use strict";

const Codec = require("../protocol/codec.js");
const { Rinfo } = require("../transport/transport.js");
const Journal = require("../core/journal.js");
const { MSG_TYPE, message, pre_prepare_data} = require("./message.js");

async function _request(gen, body, rinfo, tag) {
  const instruction = body.data.o;

  /**
   * If I don't think I'm the primary replica for this data object, forward it to who I think it is
   */ 
  const r = await this.repman.fetch_r(instruction.key);
  const v = this._get_v(instruction.key);
  const primary = this._get_p(v, r);

  if (!this.repman.my_id().equals(primary.id)) {
    Journal.log(tag, `NOT P for ${this._digest(body)}, forwarding to ${primary.address}:${primary.port}`);

    this.send({
      body: body,
      body_type: Codec.BODY_TYPE.JSON,
      rinfo: new Rinfo({address: primary.address, port: primary.port}),
      gen: this.generator()
    });

    return;
  }

  /**
   * OK, I think I'm the primary replica, so I'll multicast a pre prepare to the backups
   */ 
  const pre_prepare = message({
    type: MSG_TYPE.PRE_PREPARE,
    data: pre_prepare_data({
      v: this._get_v(instruction.key), 
      n: this._next_sequence(),
      d: this._digest(body),
      m: body
    })
  });

  /**
   * TODO: We currently broadcast the pre prepare to everyone including ourselves, to handle the
   * case where we're the only replica for a data object... 
   * const backups = r.filter(replica => !replica.id.equals(this.repman.my_id()));
   */ 
  Journal.log(tag, `AM P for ${pre_prepare.data.d}`);
  Journal.log(tag, `-> PRE-PREPARE (${r.length}) ${pre_prepare.data.d} ` + 
    `${r.map(replica => replica.address + ":" + replica.port).join(", ")}`);
  this._multicast(r, pre_prepare);
}

module.exports = { _request };
