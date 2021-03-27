/** 
* HID
* HID provides services for identity management,
* authentication, and verification
*
* 
*
*/ 

"use strict";
const { Happ_env } = require("../happ/happ_env.js");
const dict_adj_a = require("./dict/adj_4096_a.json");
const dict_adj_b = require("./dict/adj_4096_b.json");
const dict_noun = require("./dict/noun_4096.json");
const { Hutil } = require("../hutil/hutil.js");
const crypto = Happ_env.ENV === Happ_env.ENV_TYPE.NODE ? require("crypto") : null;
const { Hbigint } = Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE ? require("../htypes/hbigint/hbigint_rn.js") : require("../htypes/hbigint/hbigint_node.js");

class Hid {
    static SYM_ADJ_A = dict_adj_a;
    static SYM_ADJ_B = dict_adj_b;
    static SYM_NOUN = dict_noun;
    static SYM_ADJ_A_BW = Hutil._is_power2(dict_adj_a.length) ? Math.log2(dict_adj_a.length) : Hid.dict_err();
    static SYM_ADJ_B_BW = Hutil._is_power2(dict_adj_b.length) ? Math.log2(dict_adj_b.length) : Hid.dict_err();
    static SYM_NOUN_BW = Hutil._is_power2(dict_noun.length) ? Math.log2(dict_noun.length) : Hid.dict_err();
    static HASH_SZ = 256; // TODO: Remember to change this if we change the hash function in hash_cert!
	static POW_LEAD_ZERO_BITS = 20; // TODO: set me to a nontrivial value
    static SIG_ALGORITHM = "RSA-SHA256"; // Be careful, must work with KEY_TYPE
    static KEY_TYPE = "rsa"; // Only "rsa" is currently supported
	static MODULUS_LEN = 2048; // Only applies if KEY_TYPE is "rsa"
    // static PUBKEY_PEM_PREFIX = "PUBLIC KEY";
    // static PRIVKEY_PEM_PREFIX = "ENCRYPTED PRIVATE KEY";
    static PUBKEY_TYPE = "spki";
    static PUBKEY_FORMAT = "der";
    static PRIVKEY_TYPE = "pkcs8";
    static PRIVKEY_FORMAT = "der";
    static PRIVKEY_CIPHER = "aes-256-cbc"; // This must comport with what's available in our native crypto implementations and account for several known bugs in Java - see HNativeCrypto
    static NATIVE_CRYPTO = null;

    static GET_PRIVKEY_F = () => {
        return new Promise((resolve, reject) => {
            resolve(undefined);
        });
    };

	constructor() {

	}

    static dict_err() {
        throw new Error("Dictionary cardinality must be power of 2");
    }

    // Set the systemwide function to fetch the user's unencrypted privkey,
    // must return a Promise which resolves with the password
    static set_privkey_func(f) {
        if (typeof f !== "function") {
            throw new TypeError("Argument f must be a function");
        }

        Hid.GET_PRIVKEY_F = f;
    }

    static get_privkey() {
        return Hid.GET_PRIVKEY_F();
    }

    // Set the interface for native crypto functions
    // This must be set when ENV is REACT_NATIVE
    static set_native_crypto(ref) {
        Hid.NATIVE_CRYPTO = ref;
    }

    // TODO: we're not using this anymore, should we /dev/null it?
    // static der2pem(der_buf, is_public = true) {
    //     const type = is_public ? Hid.PUBKEY_PEM_PREFIX : Hid.PRIVKEY_PEM_PREFIX;
    //     const prefix = `-----BEGIN ${type}-----\n`;
    //     const postfix = `-----END ${type}-----`;
    //     return `${prefix}${der_buf.toString("base64").match(/.{0,64}/g).join("\n")}${postfix}`;
    // }

	static async generate_key_pair(passphrase) {
        if (Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Hid.NATIVE_CRYPTO.generateRSAKeyPair(Hid.MODULUS_LEN, passphrase);

            // TODO: handle error

            return {
                publicKey: Buffer.from(res[0]).toString("hex"),
                privateKey: Buffer.from(res[1]).toString("hex")
            }
        }

        if (Happ_env.ENV === Happ_env.ENV_TYPE.NODE) {
            const pair = crypto.generateKeyPairSync(Hid.KEY_TYPE, {
                modulusLength: Hid.MODULUS_LEN,
                publicKeyEncoding: {
                    type: Hid.PUBKEY_TYPE,
                    format: Hid.PUBKEY_FORMAT
                },
                privateKeyEncoding: {
                    type: Hid.PRIVKEY_TYPE,
                    format: Hid.PRIVKEY_FORMAT,
                    cipher: Hid.PRIVKEY_CIPHER, 
                    passphrase: passphrase
                }
            });

            pair.publicKey = Buffer.isBuffer(pair.publicKey) ? pair.publicKey.toString("hex") : pair.publicKey;
            pair.privateKey = Buffer.isBuffer(pair.privateKey) ? pair.privateKey.toString("hex") : pair.privateKey;
            return pair;
        }
	}

    // Assumes encrypted privkey key as DER buffer
    // Returns unencrypted key as DER buffer
    static async decrypt_private_key(key, passphrase) {
        if (Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Hid.NATIVE_CRYPTO.decryptPrivateKeyRSA(key.toString("hex"), passphrase);
            return Buffer.from(res, "hex");
        }

        if (Happ_env.ENV === Happ_env.ENV_TYPE.NODE) {
            return crypto.createPrivateKey({
                key: key, 
                format: Hid.PRIVKEY_FORMAT, 
                type: Hid.PRIVKEY_TYPE, 
                passphrase: passphrase
            }).export({
                format: Hid.PRIVKEY_FORMAT,
                type: Hid.PRIVKEY_TYPE
            });
        } 
    }

    // Assumes UNENCRYPTED privkey key as DER buffer
    static async sign(data, key) {
        if (Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Hid.NATIVE_CRYPTO.signRSA(data.toString("hex"), key.toString("hex"));
            return Buffer.from(res, "hex");
        }

        if (Happ_env.ENV === Happ_env.ENV_TYPE.NODE) {
            const sign = crypto.createSign(Hid.SIG_ALGORITHM);
            sign.update(data);
            sign.end();
            return sign.sign({key: key, format: Hid.PRIVKEY_FORMAT, type: Hid.PRIVKEY_TYPE});
        }
    }

    // Assumes pubkey key as DER buffer
    static async verify(data, key, sig) {
        if (Happ_env.ENV === Happ_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Hid.NATIVE_CRYPTO.verifyRSA(data.toString("hex"), key.toString("hex"), sig.toString("hex"));
            return res;
        }

        if (Happ_env.ENV === Happ_env.ENV_TYPE.NODE) {
            const verify = crypto.createVerify(Hid.SIG_ALGORITHM);
            verify.update(data);
            verify.end();
            return verify.verify({key: key, format: Hid.PUBKEY_FORMAT, type: Hid.PUBKEY_TYPE}, sig);
        }
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
