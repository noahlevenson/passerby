"use strict";

const P = require("../../passerby.json");
const Sodium = require(P.libsodium_path);

/**
 * TODO: Different libsodium bindings may require different kinds of initialization. For example:
 * When libsodium.js is loaded as a module, Sodium.ready references a Promise that must resolve 
 * before any functions can be used. We export the Sodium object here such that the protocol layer 
 * can await the Promise during early boot. But if Hermes' wasm engine isn't yet robust enough to 
 * support libsodium.js, we may have to reexmine how we boot libsodium under React Native.
 */ 

function to_hex(buf) {
  return Sodium.to_hex(buf);
}

function from_hex(str) {
  return Sodium.from_hex(str);
}

function to_base64(buf) {
  return Sodium.to_base64(buf);
}

function from_base64(str) {
  return Sodium.from_base64(str);
}

function generic_hash(len, buf) {
  return Sodium.crypto_generichash(len, buf);
}

function crypto_box_keypair() {
  return Sodium.crypto_box_keypair();
}

class Public_key {
  constructor(key, type) {
    this.key = key;
    this.type = type;
  }

  static from_pubstring(pubstring) {
    const sep = pubstring.indexOf(":");
    return new this(from_base64(pubstring.substring(0, sep)), pubstring.substring(sep + 1));
  }

  pubstring() {
    return `${to_base64(this.key)}:${this.type}`;
  }
}

class Private_key {
  constructor(key, type) {
    this._key = key;
    this.type = type;
  }
}

module.exports = { 
  Sodium, to_hex, from_hex, to_base64, from_base64, generic_hash, crypto_box_keypair, 
  Public_key, Private_key 
};