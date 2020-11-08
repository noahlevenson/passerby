/** 
* HID
* HID provides services for identity management,
* authentication, and verification
*
* 
*
*/ 

"use strict";

const crypto = require("crypto");

class Hid {
	static KEY_TYPE = "rsa";
	static MODULUS_LEN = 1024;

	constructor() {

	}

	static generate_key_pair() {
		return crypto.generateKeyPairSync(Hid.KEY_TYPE, {
			modulusLength: Hid.MODULUS_LEN,
 			publicKeyEncoding: {
			    type: 'spki',
			    format: 'pem'
  			},
  			privateKeyEncoding: {
			    type: 'pkcs8',
			    format: 'pem',
			    cipher: 'aes-256-cbc',

			    passphrase: "test"  // TODO: set passphrase!
  			}
		});
	}
}

module.exports.Hid = Hid;