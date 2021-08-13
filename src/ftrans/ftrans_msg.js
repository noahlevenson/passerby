/** 
* FTRANS_MSG
* Free Food's wire format
* 
* 
* 
* 
*/ 

"use strict";

const { Fapp_cfg } = require("../fapp/fapp_cfg.js");
const cfg = require("../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Fkad_msg } = require("../fkad/fkad_msg.js");
const { Fstun_msg } = require("../fstun/fstun_msg.js"); 
const { Fbuy_msg } = require("../fbuy/fbuy_msg.js");
const { Fdlt_msg } = require("../fdlt/fdlt_msg.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js");

class Ftrans_msg {
  static ID_LEN = 8;
  
  // F-prefix messages are self explanatory; ACK, PING, and PONG are general purpose types for use 
  // by Ftrans subclasses now and in the future (Our UDP subclass currently uses ACK to implement 
  // retransmission, and PING/PONG are used for NAT keepalive)
  static TYPE = {
    FKAD: 0,
    FSTUN: 1,
    FBUY: 2,
    FDLT: 3,
    ACK: 4,
    PING: 5,
    PONG: 6
  };

  msg;
  type;
  pubkey;
  sig;
  iv;
  id;

  constructor({
    msg = null, 
    type = null, 
    pubkey = null, 
    sig = null, 
    key = null, 
    iv = null, 
    id = null
  } = {}) {
    // TODO: Validation!
    this.msg = msg;
    this.type = type;
    // Sender's pubkey
    this.pubkey = pubkey;
    // Signature of sender over msg
    this.sig = sig;
    // One time symmetric key (must be encrypted)
    this.key = key;
    // IV for one time key (send it in the clear)
    this.iv = iv;
    // Not used by default, but Ftrans subclasses may utilize it
    this.id = id;
  }

  // Construct a decrypted Ftrans_msg from an encrypted Ftrans_msg
  static async decrypted_from(ftrans_msg) {
    try {
      const privkey = await Fcrypto.get_privkey();
      
      const one_time_key = await Fcrypto.private_decrypt(
        Buffer.from(ftrans_msg.key, "hex"), 
        privkey
      );
      
      const decrypted_msg = await Fcrypto.symmetric_decrypt(
        Buffer.from(ftrans_msg.msg, "hex"), 
        one_time_key, 
        Buffer.from(ftrans_msg.iv, "hex")
      );

      const valid_sig = await Fcrypto.verify(
        decrypted_msg, 
        Buffer.from(ftrans_msg.pubkey, "hex"), 
        Buffer.from(ftrans_msg.sig, "hex")
      );

      if (!valid_sig) {
        throw new Error();
      }

      return new Ftrans_msg({
        msg: JSON.parse(decrypted_msg.toString(), Fbigint._json_revive),
        type: ftrans_msg.type,
        pubkey: ftrans_msg.pubkey,
        sig: ftrans_msg.sig,
        key: ftrans_msg.key,
        iv: ftrans_msg.iv,
        id: ftrans_msg.id
      });
    } catch (err) {
      return null;
    }
  }

  // Construct an encrypted Ftrans_msg
  static async encrypted_from({
    msg = null, 
    type = null,
    sender_pubkey = null, 
    recip_pubkey = null, 
    id = null
  } = {}) {
    const ftrans_msg = new Ftrans_msg({id: id, type: type});

    if (typeof sender_pubkey !== "string" || typeof recip_pubkey !== "string") {
      throw new Error("sender_pubkey and recip_pubkey must be strings");
    }

    const privkey = await Fcrypto.get_privkey();
    const msg_buf = Buffer.from(JSON.stringify(msg));
    const sig = await Fcrypto.sign(msg_buf, privkey);
    const one_time_key = await Fcrypto.generate_one_time_key();
    const iv = await Fcrypto.generate_one_time_iv();
    const encrypted_msg = await Fcrypto.symmetric_encrypt(msg_buf, one_time_key, iv);
    const encrypted_key = await Fcrypto.public_encrypt(one_time_key, Buffer.from(recip_pubkey, "hex"))

    ftrans_msg.sig = sig.toString("hex");
    ftrans_msg.iv = iv.toString("hex");
    ftrans_msg.msg = encrypted_msg.toString("hex");
    ftrans_msg.key = encrypted_key.toString("hex");
    ftrans_msg.pubkey = sender_pubkey;
    return ftrans_msg;
  }
}

module.exports.Ftrans_msg = Ftrans_msg;