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

	constructor() {

	}

	static generate_key_pair() {
		return crypto.generateKeyPairSync(Hid.KEY_TYPE, {
			modulusLength: 4096,
 			publicKeyEncoding: {
			    type: 'spki',
			    format: 'pem'
  			},
  			privateKeyEncoding: {
			    type: 'pkcs8',
			    format: 'pem',
			    cipher: 'aes-256-cbc'
  			}
		});
	}
}

module.exports.Hid = Hid;