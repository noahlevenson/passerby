/** 
* FID_PUB
* Public key certificate
* 
* 
* 
*
*/ 

"use strict";

const { Fcrypto } = require("../fcrypto/fcrypto.js");
const { Fgeo_coord } = require("../fgeo/fgeo_coord.js");
const { Fpht_key } = require("../fpht/fpht_key.js");

class Fid_pub {
  /**
   * TODO: validation, enforce primitive types
   */ 
  pubkey;
  name;
  first;
  last;
  address;
  phone;
  lat;
  long;
  peer_id;
  nonce;

  constructor({
    pubkey = null, 
    name = null, 
    first = null, 
    last = null, 
    address = null, 
    phone = null, 
    lat = null, 
    long = null
  } = {}) {
    this.pubkey = pubkey;
    this.name = name;
    this.first = first;
    this.last = last;
    this.address = address;
    this.phone = phone;
    this.lat = lat;
    this.long = long;
    this.peer_id = Fcrypto.sha1(this.pubkey);
    this.nonce = "00"; // Need two digits for Buffer to parse correctly
  }

  /**
   * Construct the location key for a Fid_pub
   */ 
  static get_location_key(fid_pub) {
    return new Fpht_key({
      integral: new Fgeo_coord({lat: fid_pub.lat, long: fid_pub.long}).linearize(),
      meta: fid_pub.pubkey
    });
  }

  /**
   * We want to be able to increment the nonce but also store the result immediately as a hex string
   * which always has explicit leading zeroes. TODO: strong suspicion that this complexity is only 
   * required because of the way the Buffer constructor parses hex strings. Given hex string "05f", 
   * Buffer will return 1-byte Buffer 0x05. To construct 2-byte Buffer 0x005f, you need to add the
   * implied leading zero to your string, i.e. "005f".
   */  
  static inc_nonce(fid_pub) {
    const unpad = (parseInt(fid_pub.nonce, 16) + 1).toString(16);
    fid_pub.nonce = unpad.padStart(unpad.length + (unpad.length % 2), "0");
  }
}

module.exports.Fid_pub = Fid_pub;