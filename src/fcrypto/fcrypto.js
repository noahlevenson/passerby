/** 
* FCRYPTO
* Cryptography
* 
*
* 
*
*/ 

"use strict";

const crypto = require("crypto");
const { Fapp_cfg } = require("../fapp/fapp_cfg.js");
const cfg = require("../../libfood.json");

class Fcrypto {
  /**
   * Notes:
   * 1. Be sure that SIG_ALGORITHM works with KEY_TYPE!
   * 2. The only KEY_TYPE currently supported is "rsa"
   * 3. MODULUS_LEN only applies if KEY_TYPE is "rsa"
   * 4. PRIVKEY_CIPHER and ONE_TIME_KEY_CIPHER must comport with what's available in our native 
   *    crypto implementations and take into account several known Java bugs - see fnative
   */

  static SHA1 = "SHA1";
  static SHA256 = "SHA256";
  static SIG_ALGORITHM = "RSA-SHA256";
  static KEY_TYPE = "rsa";
  static MODULUS_LEN = 2048;
  static PUBKEY_TYPE = "spki";
  static PUBKEY_FORMAT = "der";
  static PRIVKEY_TYPE = "pkcs8";
  static PRIVKEY_FORMAT = "der";
  static PRIVKEY_CIPHER = "aes-256-cbc";
  static ONE_TIME_KEY_LEN = 32;
  static ONE_TIME_IV_LEN = 16;
  static ONE_TIME_KEY_CIPHER = "aes-256-cbc";
  static NATIVE_CRYPTO = null;

  static GET_PRIVKEY_F = () => {
    return new Promise((resolve, reject) => {
        resolve(undefined);
    });
  };

  /**
   * Set the systemwide function to fetch the user's unencrypted privkey, must return a Promise 
   * which resolves with the privkey
   */ 
  static set_privkey_func(f) {
    if (typeof f !== "function") {
        throw new TypeError("Argument f must be a function");
    }

    Fcrypto.GET_PRIVKEY_F = f;
  }

  static get_privkey() {
    return Fcrypto.GET_PRIVKEY_F();
  }

  /**
   * Set the interface for native crypto functions. This must be set when ENV is REACT_NATIVE.
   */ 
  static set_native_crypto(ref) {
    Fcrypto.NATIVE_CRYPTO = ref;
  }

  /**
   * TODO: this is not currently in use, right?
   */ 
  static async random_bytes_strong(len) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.randomBytes(len);

      // TODO: handle error

      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      return crypto.randomBytes(len);
    }
  }

  /**
   * Compute the SHA1 hash of 'data', returns a hex string
   */ 
  static sha1(data) {
    const hash = crypto.createHash(Fcrypto.SHA1);
    hash.update(data);
    return hash.digest("hex");
  }

  /**
   * Compute the SHA256 hash of 'data', returns a hex string
   */ 
  static sha256(data) {
    const hash = crypto.createHash(Fcrypto.SHA256);
    hash.update(data);
    return hash.digest("hex");
  }

  /**
   * Generate an asymmetric keypair, encrypting the private key with password 'passphrase'
   */ 
  static async generate_key_pair(passphrase) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.generateRSAKeyPair(Fcrypto.MODULUS_LEN, passphrase);

      // TODO: handle error

      return {
        publicKey: Buffer.from(res[0]).toString("hex"),
        privateKey: Buffer.from(res[1]).toString("hex")
      };
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      const pair = crypto.generateKeyPairSync(Fcrypto.KEY_TYPE, {
        modulusLength: Fcrypto.MODULUS_LEN,
        publicKeyEncoding: {
          type: Fcrypto.PUBKEY_TYPE,
          format: Fcrypto.PUBKEY_FORMAT
        },
        privateKeyEncoding: {
          type: Fcrypto.PRIVKEY_TYPE,
          format: Fcrypto.PRIVKEY_FORMAT,
          cipher: Fcrypto.PRIVKEY_CIPHER, 
          passphrase: passphrase
        }
      });

      pair.publicKey = Buffer.isBuffer(pair.publicKey) ? 
        pair.publicKey.toString("hex") : pair.publicKey;
      
      pair.privateKey = Buffer.isBuffer(pair.privateKey) ? 
        pair.privateKey.toString("hex") : pair.privateKey;
      
      return pair;
    }
  }

  /**
   * Generate a one time key, returns key as Buffer
   */ 
  static async generate_one_time_key() {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.randomBytes(Fcrypto.ONE_TIME_KEY_LEN);
      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      return crypto.randomBytes(Fcrypto.ONE_TIME_KEY_LEN);
    }
  }

  /**
   * Generate a one time IV, returns IV as Buffer
   */ 
  static async generate_one_time_iv() {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.randomBytes(Fcrypto.ONE_TIME_IV_LEN);
      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      return crypto.randomBytes(Fcrypto.ONE_TIME_IV_LEN);
    }
  }

  /**
   * Decrypt encrypted private key 'key' using password 'passphrase'. Pass 'key' as DER Buffer.
   * Returns unecrypted key as DER Buffer
   */ 
  static async decrypt_private_key(key, passphrase) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.decryptPrivateKeyRSA(key.toString("hex"), passphrase);
      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      return crypto.createPrivateKey({
        key: key, 
        format: Fcrypto.PRIVKEY_FORMAT, 
        type: Fcrypto.PRIVKEY_TYPE, 
        passphrase: passphrase
      }).export({
        format: Fcrypto.PRIVKEY_FORMAT,
        type: Fcrypto.PRIVKEY_TYPE
      });
    } 
  }

  /**
   * Compute the cryptographic signature over 'data' using private key 'key'. Pass 'key' as 
   * unencrypted DER Buffer. Returns sig as Buffer
   */  
  static async sign(data, key) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.signRSA(data.toString("hex"), key.toString("hex"));
      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      const sign = crypto.createSign(Fcrypto.SIG_ALGORITHM);
      sign.update(data);
      sign.end();
      return sign.sign({key: key, format: Fcrypto.PRIVKEY_FORMAT, type: Fcrypto.PRIVKEY_TYPE});
    }
  }

  /**
   * Verify the authenticity of signature 'sig' over 'data'. Pass public key 'key' as DER Buffer.
   * Returns a bool
   */ 
  static async verify(data, key, sig) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.verifyRSA(
        data.toString("hex"), 
        key.toString("hex"), 
        sig.toString("hex")
      );
      
      return res;
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      const verify = crypto.createVerify(Fcrypto.SIG_ALGORITHM);
      verify.update(data);
      verify.end();
      
      return verify.verify({
        key: key, 
        format: Fcrypto.PUBKEY_FORMAT, 
        type: Fcrypto.PUBKEY_TYPE
      }, sig);
    }
  }

  /**
   * Encrypt 'data' using a symmetric key. Pass 'one_time_key' as Buffer, iv as Buffer
   */ 
  static async symmetric_encrypt(data, one_time_key, iv) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.symmetricEncrypt(
        data.toString("hex"), 
        one_time_key.toString("hex"), 
        iv.toString("hex")
      );

      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      const cipher = crypto.createCipheriv(Fcrypto.ONE_TIME_KEY_CIPHER, one_time_key, iv);
      const encrypted = cipher.update(data);
      return Buffer.concat([encrypted, cipher.final()]);
    }
  }

  /**
   * Decrypt 'data' using a symmetric key. Pass 'one_time_key' as Buffer, iv as Buffer
   */ 
  static async symmetric_decrypt(data, one_time_key, iv) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.symmetricDecrypt(
        data.toString("hex"), 
        one_time_key.toString("hex"), 
        iv.toString("hex")
      );

      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      const cipher = crypto.createDecipheriv(Fcrypto.ONE_TIME_KEY_CIPHER, one_time_key, iv);
      const decrypted = cipher.update(data);
      return Buffer.concat([decrypted, cipher.final()]);
    }
  }

  /**
   * Encrypt 'data' using public key 'key'. Pass 'data' as Buffer, 'key' as DER Buffer
   */ 
  static async public_encrypt(data, key) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.publicEncryptRSA(
        data.toString("hex"), 
        key.toString("hex")
      );
      
      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      return crypto.publicEncrypt({
        key: key, 
        format: Fcrypto.PUBKEY_FORMAT, 
        type: Fcrypto.PUBKEY_TYPE
      }, data);
    }
  }

  /**
   * Decrypt 'data' using private key 'key'. Pass 'data' as Buffer, 'key' as unencrypted DER Buffer
   */ 
  static async private_decrypt(data, key) {
    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE) {
      const res = await Fcrypto.NATIVE_CRYPTO.privateDecryptRSA(
        data.toString("hex"), 
        key.toString("hex")
      );

      return Buffer.from(res);
    }

    if (Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.NODE) {
      return crypto.privateDecrypt({
        key: key, 
        format: Fcrypto.PRIVKEY_FORMAT, 
        type: Fcrypto.PRIVKEY_TYPE
      }, data);
    }
  }
}

module.exports.Fcrypto = Fcrypto;