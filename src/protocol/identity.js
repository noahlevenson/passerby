"use strict";

const Crypto = require("../core/crypto.js");

class Identity {
  constructor() {
    const keypair = Crypto.crypto_box_keypair();
    this.public_key = new Public_key(keypair.publicKey, keypair.keyType);
    this._private_key = new Private_key(keypair.privateKey, keypair.keyType);
  }
}

class Public_key {
  constructor(key, type) {
    this.key = key;
    this.type = type;
  }

  /**
   * TODO: Validate and fail gracefully
   */ 
  static from_pubstring(pubstring) {
    const sep = pubstring.indexOf(":");
    return new this(Crypto.from_base64(pubstring.substring(0, sep)), pubstring.substring(sep + 1));
  }

  pubstring() {
    return `${Crypto.to_base64(this.key)}:${this.type}`;
  }
}

class Private_key {
  constructor(key, type) {
    this._key = key;
    this.type = type;
  }
}

module.exports = { Identity, Public_key, Private_key };