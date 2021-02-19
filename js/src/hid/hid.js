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
    static HASH_BIT_WIDTH = 160;
	static POW_SOLUTION_LEAD_BITS = 20; // TODO: what's the optimal setting for ~10 min compute time on an average tablet?
	static KEY_TYPE = "rsa";
	static MODULUS_LEN = 1024;

	constructor() {

	}

    static dict_err() {
        throw new Error("Dictionary cardinality must be power of 2");
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

	// TODO: We might need 256 bits or more to get the time complexity we need
	static hash_cert(cert, str = false) {
        const h = Hutil._sha1(JSON.stringify(cert));
		return str ? h : new Hbigint(h);
	}

	static is_valid_pow(hash, n_lead_bits) {
        const offset = new Hbigint(Hid.HASH_BIT_WIDTH - n_lead_bits);
		const mask = new Hbigint(Math.pow(2, n_lead_bits) - 1).shift_left(offset);
		return hash.and(mask).shift_right(offset).equals(new Hbigint(0));
	}

	static partial_hash_inversion(obj, f, n_lead_bits) {
		return new Promise((resolve, reject) => {
            while (!Hid.is_valid_pow(Hid.hash_cert(obj), n_lead_bits)) {
	            f(obj);
		    }

		    resolve(obj);
        });
    }

    static get_symbol_indices(cert) {
        const hash = Hid.hash_cert(cert);

        if (!Hid.is_valid_pow(hash, Hid.POW_SOLUTION_LEAD_BITS)) {
            return null; 
        }
        
        // TODO: test this
        const a = hash.and(new Hbigint(Math.pow(2, Hid.SYM_ADJ_A_BW) - 1));
        
        const b = hash.and(new Hbigint(Math.pow(2, Hid.SYM_ADJ_B_BW) - 1).shift_left(new Hbigint(Hid.SYM_ADJ_A_BW)))
            .shift_right(new Hbigint(Hid.SYM_ADJ_A_BW));

        const c = hash.and(new Hbigint(Math.pow(2, Hid.SYM_NOUN_BW) - 1).shift_left(new Hbigint(Hid.SYM_ADJ_A_BW + 
            Hid.SYM_ADJ_B_BW))).shift_right(new Hbigint(Hid.SYM_ADJ_A_BW + Hid.SYM_ADJ_B_BW));
        
        return [parseInt(a.toString(10)), parseInt(b.toString(10)), parseInt(c.toString(10))];
    }
}

module.exports.Hid = Hid;
