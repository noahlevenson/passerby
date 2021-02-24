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
const dict_adj_a = require("./dict/adj_4096_a.json");
const dict_adj_b = require("./dict/adj_4096_b.json");
const dict_noun = require("./dict/noun_4096.json");
const { Happ_env } = require("../happ/happ_env.js");
const { Hutil } = require("../hutil/hutil.js");
const { Hbigint } = Happ_env.BROWSER ? require("../htypes/hbigint/hbigint_browser.js") : require("../htypes/hbigint/hbigint_node.js");

class Hid {
    static SYM_ADJ_A = dict_adj_a;
    static SYM_ADJ_B = dict_adj_b;
    static SYM_NOUN = dict_noun;
    static SYM_ADJ_A_BW = Hutil._is_power2(dict_adj_a.length) ? Math.log2(dict_adj_a.length) : Hid.dict_err();
    static SYM_ADJ_B_BW = Hutil._is_power2(dict_adj_b.length) ? Math.log2(dict_adj_b.length) : Hid.dict_err();
    static SYM_NOUN_BW = Hutil._is_power2(dict_noun.length) ? Math.log2(dict_noun.length) : Hid.dict_err();
    static HASH_SZ = 256; // TODO: Remember to change this if we change the hash function in hash_cert!
	static POW_LEAD_ZERO_BITS = 20; // TODO: set me to a nontrivial value
	
    static KEY_TYPE = "ec";
    static CURVE = "secp256k1" // Only applies if KEY_TYPE is "ec"
	static MODULUS_LEN = 1024; // Only applies if KEY_TYPE is "rsa"

	constructor() {

	}

    static dict_err() {
        throw new Error("Dictionary cardinality must be power of 2");
    }

	static generate_key_pair() {
		return crypto.generateKeyPairSync(Hid.KEY_TYPE, {
			modulusLength: Hid.MODULUS_LEN,
            namedCurve: Hid.CURVE,
 			publicKeyEncoding: {
			    type: 'spki',
			    format: 'der'
  			},
  			privateKeyEncoding: {
			    type: 'pkcs8',
			    format: 'pem',
			    // cipher: 'aes-256-cbc'  // TODO: set cipher and passphrase!
			    // passphrase: "test"
  			}
		});
	}

    // Assumes key as PEM string
    static sign(data, key) {
        return crypto.sign(null, data, key);
    }

    // Assumes key as DER buffer
    static verify(data, key, sig) {
        return crypto.verify(null, data, crypto.createPublicKey({key: key, format: "der", type: "spki"}), sig);
    }

	static hash_cert(cert, str = false) {
        const h = Hutil._sha256(JSON.stringify(cert));
		return str ? h : new Hbigint(h);
	}

	static is_valid_pow(hash, n_lead_zero_bits) {
        const offset = new Hbigint(Hid.HASH_SZ - n_lead_zero_bits);
		const mask = new Hbigint(Math.pow(2, n_lead_zero_bits) - 1).shift_left(offset);
		return hash.and(mask).shift_right(offset).equals(new Hbigint(0));
	}

    // Find a partial preimage (by brute force) for hash_cert(obj) which has n_lead_zero_bits
    // function 'mod' modifies obj (e.g., to increment a nonce) after each attempt
	static find_partial_preimage(obj, mod, n_lead_zero_bits) {
		return new Promise((resolve, reject) => {
            while (!Hid.is_valid_pow(Hid.hash_cert(obj), n_lead_zero_bits)) {
	            mod(obj);
		    }

		    resolve(obj);
        });
    }

    static get_symbol_indices(cert) {
        const hash = Hid.hash_cert(cert);
        
        if (!Hid.is_valid_pow(hash, Hid.POW_LEAD_ZERO_BITS)) {
            return null; 
        }

        const mask_a = new Hbigint(Math.pow(2, Hid.SYM_ADJ_A_BW) - 1);
        const mask_b = new Hbigint(Math.pow(2, Hid.SYM_ADJ_B_BW) - 1).shift_left(new Hbigint(Hid.SYM_ADJ_A_BW));
        const mask_c = new Hbigint(Math.pow(2, Hid.SYM_NOUN_BW) - 1).shift_left(new Hbigint(Hid.SYM_ADJ_A_BW + Hid.SYM_ADJ_B_BW));
        
        // TODO: test this
        const a = hash.and(mask_a);
        const b = hash.and(mask_b).shift_right(new Hbigint(Hid.SYM_ADJ_A_BW));
        const c = hash.and(mask_c).shift_right(new Hbigint(Hid.SYM_ADJ_A_BW + Hid.SYM_ADJ_B_BW));  
        return [parseInt(a.toString(10)), parseInt(b.toString(10)), parseInt(c.toString(10))];
    }
}

module.exports.Hid = Hid;
