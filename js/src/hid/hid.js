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
    static GET_PASSPHRASE_F = () => {
        return new Promise((resolve, reject) => {
            resolve(undefined);
        });
    };

    static SYM_ADJ_A = dict_adj_a;
    static SYM_ADJ_B = dict_adj_b;
    static SYM_NOUN = dict_noun;
    static SYM_ADJ_A_BW = Hutil._is_power2(dict_adj_a.length) ? Math.log2(dict_adj_a.length) : Hid.dict_err();
    static SYM_ADJ_B_BW = Hutil._is_power2(dict_adj_b.length) ? Math.log2(dict_adj_b.length) : Hid.dict_err();
    static SYM_NOUN_BW = Hutil._is_power2(dict_noun.length) ? Math.log2(dict_noun.length) : Hid.dict_err();
    static HASH_SZ = 256; // TODO: Remember to change this if we change the hash function in hash_cert!
	static POW_LEAD_ZERO_BITS = 20; // TODO: set me to a nontrivial value
    static SIG_ALGORITHM = "SHA256";
    static KEY_TYPE = "rsa"; // Only "rsa" is currently supported
	static MODULUS_LEN = 2048; // Only applies if KEY_TYPE is "rsa"
    
	constructor() {

	}

    static dict_err() {
        throw new Error("Dictionary cardinality must be power of 2");
    }

    // Set the systemwide function to fetch the user's passphrase
    // must return a Promise which resolves with the password
    static set_passphrase_func(f) {
        if (typeof f !== "function") {
            throw new TypeError("Argument f must be a function");
        }

        Hid.GET_PASSPHRASE_F = f;
    }

    static get_passphrase() {
        return Hid.GET_PASSPHRASE_F();
    }

	static generate_key_pair(passphrase) {
		const pair = crypto.generateKeyPairSync(Hid.KEY_TYPE, {
			modulusLength: Hid.MODULUS_LEN,
 			publicKeyEncoding: {
			    type: "spki",
			    format: "pem"
  			},
  			privateKeyEncoding: {
			    type: "pkcs8",
			    format: "pem",
			    cipher: "aes-256-cbc", // TODO: is this optimal cipher?
			    passphrase: passphrase
  			}
		});

        pair.publicKey = Buffer.isBuffer(pair.publicKey) ? pair.publicKey.toString("hex") : pair.publicKey;
        return pair;
	}

    // Assumes key as PEM string
    static sign(data, key, passphrase) {
        const sign = crypto.createSign(Hid.SIG_ALGORITHM);
        sign.update(data);
        sign.end();
        return sign.sign(crypto.createPrivateKey({key: key, format: "pem", passphrase: passphrase}));
    }

    // Assumes key as DER buffer
    static verify(data, key, sig) {
        const verify = crypto.createVerify(Hid.SIG_ALGORITHM);
        verify.update(data);
        verify.end();
        return verify.verify(crypto.createPublicKey({key: key, format: "der", type: "spki"}), sig);
    }

    // Hashing a cert means hashing the concatenation of its pubkey and its nonce
	static hash_cert(pubkey, nonce, str = false) {
        const h = Hutil._sha256(`${pubkey}${nonce}`);
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
            while (!Hid.is_valid_pow(Hid.hash_cert(obj.pubkey, obj.nonce), n_lead_zero_bits)) {
	            mod(obj);
		    }

		    resolve(obj);
        });
    }

    static get_symbol_indices(cert) {
        const hash = Hid.hash_cert(cert.pubkey, cert.nonce);
        
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
