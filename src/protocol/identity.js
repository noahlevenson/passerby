"use strict";

const Crypto = require("../core/crypto.js");

class Identity {
  constructor() {
    const keypair = Crypto.crypto_box_keypair();
    this.public_key = new Crypto.Public_key(keypair.publicKey, keypair.keyType);
    this._private_key = new Crypto.Private_key(keypair.privateKey, keypair.keyType);
  }
}

module.exports = { Identity };