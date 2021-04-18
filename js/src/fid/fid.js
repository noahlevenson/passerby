/** 
* FID
* FID provides services for identity management,
* authentication, and verification
*
* 
*
*/ 

"use strict";

const { Fapp_env } = require("../fapp/fapp_env.js");
const dict_adj_a = require("./dict/adj_4096_a.json");
const dict_adj_b = require("./dict/adj_4096_b.json");
const dict_noun = require("./dict/noun_4096.json");
const { Futil } = require("../futil/futil.js");
const crypto = Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE ? require("crypto") : null;
const { Fbigint } = Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE ? require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");

class Fid {
    static SYM_ADJ_A = dict_adj_a;
    static SYM_ADJ_B = dict_adj_b;
    static SYM_NOUN = dict_noun;
    static SYM_ADJ_A_BW = Futil._is_power2(dict_adj_a.length) ? Math.log2(dict_adj_a.length) : Fid.dict_err();
    static SYM_ADJ_B_BW = Futil._is_power2(dict_adj_b.length) ? Math.log2(dict_adj_b.length) : Fid.dict_err();
    static SYM_NOUN_BW = Futil._is_power2(dict_noun.length) ? Math.log2(dict_noun.length) : Fid.dict_err();
    static HASH_SZ = 256; // TODO: Remember to change this if we change the hash function in hash_cert!
	static POW_LEAD_ZERO_BITS = 3; // TODO: set me to a nontrivial value
    static SIG_ALGORITHM = "RSA-SHA256"; // Be careful, must work with KEY_TYPE
    static KEY_TYPE = "rsa"; // Only "rsa" is currently supported
	static MODULUS_LEN = 2048; // Only applies if KEY_TYPE is "rsa"
    // static PUBKEY_PEM_PREFIX = "PUBLIC KEY";
    // static PRIVKEY_PEM_PREFIX = "ENCRYPTED PRIVATE KEY";
    static PUBKEY_TYPE = "spki";
    static PUBKEY_FORMAT = "der";
    static PRIVKEY_TYPE = "pkcs8";
    static PRIVKEY_FORMAT = "der";
    static PRIVKEY_CIPHER = "aes-256-cbc"; // This must comport with what's available in our native crypto implementations and account for several known bugs in Java - see FNativeCrypto
    static ONE_TIME_KEY_LEN = 32;
    static ONE_TIME_IV_LEN = 16;
    static ONE_TIME_KEY_CIPHER = "aes-256-cbc"; // This must comport with what's available in our native crypto implementations and account for several known bugs in Java - see FNativeCrypto
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

        Fid.GET_PRIVKEY_F = f;
    }

    static get_privkey() {
        return Fid.GET_PRIVKEY_F();
    }

    // Set the interface for native crypto functions
    // This must be set when ENV is REACT_NATIVE
    static set_native_crypto(ref) {
        Fid.NATIVE_CRYPTO = ref;
    }

    // TODO: we're not using this anymore, should we /dev/null it?
    // static der2pem(der_buf, is_public = true) {
    //     const type = is_public ? Fid.PUBKEY_PEM_PREFIX : Fid.PRIVKEY_PEM_PREFIX;
    //     const prefix = `-----BEGIN ${type}-----\n`;
    //     const postfix = `-----END ${type}-----`;
    //     return `${prefix}${der_buf.toString("base64").match(/.{0,64}/g).join("\n")}${postfix}`;
    // }

    // TODO: this is not currently in use, right?
    static async random_bytes_strong(len) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.randomBytes(len);

            // TODO: handle error

            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            return crypto.randomBytes(len);
        }
    }

	static async generate_key_pair(passphrase) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.generateRSAKeyPair(Fid.MODULUS_LEN, passphrase);

            // TODO: handle error

            return {
                publicKey: Buffer.from(res[0]).toString("hex"),
                privateKey: Buffer.from(res[1]).toString("hex")
            }
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            const pair = crypto.generateKeyPairSync(Fid.KEY_TYPE, {
                modulusLength: Fid.MODULUS_LEN,
                publicKeyEncoding: {
                    type: Fid.PUBKEY_TYPE,
                    format: Fid.PUBKEY_FORMAT
                },
                privateKeyEncoding: {
                    type: Fid.PRIVKEY_TYPE,
                    format: Fid.PRIVKEY_FORMAT,
                    cipher: Fid.PRIVKEY_CIPHER, 
                    passphrase: passphrase
                }
            });

            pair.publicKey = Buffer.isBuffer(pair.publicKey) ? pair.publicKey.toString("hex") : pair.publicKey;
            pair.privateKey = Buffer.isBuffer(pair.privateKey) ? pair.privateKey.toString("hex") : pair.privateKey;
            return pair;
        }
	}

    // Returns key as buffer
    static async generate_one_time_key() {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.randomBytes(Fid.ONE_TIME_KEY_LEN);
            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            return crypto.randomBytes(Fid.ONE_TIME_KEY_LEN);
        }
    }

    // Returns IV as buffer
    static async generate_one_time_iv() {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.randomBytes(Fid.ONE_TIME_IV_LEN);
            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            return crypto.randomBytes(Fid.ONE_TIME_IV_LEN);
        }
    }

    // Assumes encrypted privkey key as DER buffer
    // Returns unencrypted key as DER buffer
    static async decrypt_private_key(key, passphrase) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.decryptPrivateKeyRSA(key.toString("hex"), passphrase);
            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            return crypto.createPrivateKey({
                key: key, 
                format: Fid.PRIVKEY_FORMAT, 
                type: Fid.PRIVKEY_TYPE, 
                passphrase: passphrase
            }).export({
                format: Fid.PRIVKEY_FORMAT,
                type: Fid.PRIVKEY_TYPE
            });
        } 
    }

    // Assumes UNENCRYPTED privkey key as DER buffer
    static async sign(data, key) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.signRSA(data.toString("hex"), key.toString("hex"));
            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            const sign = crypto.createSign(Fid.SIG_ALGORITHM);
            sign.update(data);
            sign.end();
            return sign.sign({key: key, format: Fid.PRIVKEY_FORMAT, type: Fid.PRIVKEY_TYPE});
        }
    }

    // Assumes pubkey key as DER buffer
    static async verify(data, key, sig) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.verifyRSA(data.toString("hex"), key.toString("hex"), sig.toString("hex"));
            return res;
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            const verify = crypto.createVerify(Fid.SIG_ALGORITHM);
            verify.update(data);
            verify.end();
            return verify.verify({key: key, format: Fid.PUBKEY_FORMAT, type: Fid.PUBKEY_TYPE}, sig);
        }
    }

    // Assumes symmetric key one_time_key as buffer, iv as buffer
    static async symmetric_encrypt(data, one_time_key, iv) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.symmetricEncrypt(data.toString("hex"), one_time_key.toString("hex"), iv.toString("hex"));
            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            const cipher = crypto.createCipheriv(Fid.ONE_TIME_KEY_CIPHER, one_time_key, iv);
            const encrypted = cipher.update(data);
            return Buffer.concat([encrypted, cipher.final()]);
        }
    }

    // Assumes symmetric key one_time_key as buffer, iv as buffer
    static async symmetric_decrypt(data, one_time_key, iv) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.symmetricDecrypt(data.toString("hex"), one_time_key.toString("hex"), iv.toString("hex"));
            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            const cipher = crypto.createDecipheriv(Fid.ONE_TIME_KEY_CIPHER, one_time_key, iv);
            const decrypted = cipher.update(data);
            return Buffer.concat([decrypted, cipher.final()]);
        }
    }

    // Assumes pubkey key as DER buffer, data as buffer
    static async public_encrypt(data, key) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.publicEncryptRSA(data.toString("hex", key.toString("hex")));
            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            return crypto.publicEncrypt({key: key, format: Fid.PUBKEY_FORMAT, type: Fid.PUBKEY_TYPE}, data);
        }
    }

    // Assumes UNENCRYPTED privkey key as DER buffer, data as buffer
    static async private_decrypt(data, key) {
        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.REACT_NATIVE) {
            const res = await Fid.NATIVE_CRYPTO.privateDecryptRSA(data.toString("hex"), key.toString("hex"));
            return Buffer.from(res);
        }

        if (Fapp_env.ENV === Fapp_env.ENV_TYPE.NODE) {
            return crypto.privateDecrypt({key: key, format: Fid.PRIVKEY_FORMAT, type: Fid.PRIVKEY_TYPE}, data);
        }
    }

    // Hashing a cert means hashing the concatenation of its pubkey and its nonce
	static hash_cert(pubkey, nonce, str = false) {
        const h = Futil._sha256(`${pubkey}${nonce}`);
		return str ? h : new Fbigint(h);
	}

	static is_valid_pow(hash, n_lead_zero_bits) {
        const offset = new Fbigint(Fid.HASH_SZ - n_lead_zero_bits);
		const mask = new Fbigint(Math.pow(2, n_lead_zero_bits) - 1).shift_left(offset);
		return hash.and(mask).shift_right(offset).equals(new Fbigint(0));
	}

    // Find a partial preimage (by brute force) for hash_cert(obj) which has n_lead_zero_bits
    // function 'mod' modifies obj (e.g., to increment a nonce) after each attempt
	static find_partial_preimage(obj, mod, n_lead_zero_bits) {
		return new Promise((resolve, reject) => {
            while (!Fid.is_valid_pow(Fid.hash_cert(obj.pubkey, obj.nonce), n_lead_zero_bits)) {
	            mod(obj);
		    }

		    resolve(obj);
        });
    }

    static get_symbol_indices(cert) {
        const hash = Fid.hash_cert(cert.pubkey, cert.nonce);
        
        if (!Fid.is_valid_pow(hash, Fid.POW_LEAD_ZERO_BITS)) {
            return null; 
        }

        const mask_a = new Fbigint(Math.pow(2, Fid.SYM_ADJ_A_BW) - 1);
        const mask_b = new Fbigint(Math.pow(2, Fid.SYM_ADJ_B_BW) - 1).shift_left(new Fbigint(Fid.SYM_ADJ_A_BW));
        const mask_c = new Fbigint(Math.pow(2, Fid.SYM_NOUN_BW) - 1).shift_left(new Fbigint(Fid.SYM_ADJ_A_BW + Fid.SYM_ADJ_B_BW));
        
        // TODO: test this
        const a = hash.and(mask_a);
        const b = hash.and(mask_b).shift_right(new Fbigint(Fid.SYM_ADJ_A_BW));
        const c = hash.and(mask_c).shift_right(new Fbigint(Fid.SYM_ADJ_A_BW + Fid.SYM_ADJ_B_BW));  
        return [parseInt(a.toString(10)), parseInt(b.toString(10)), parseInt(c.toString(10))];
    }
}

module.exports.Fid = Fid;
