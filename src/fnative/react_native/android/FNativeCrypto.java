// TODO: is there a better way to do this
package com.REPLACE_ME_WITH_YOUR_APP_NAME;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import java.lang.Character;
import java.util.Map;
import java.util.HashMap;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.KeyPairGenerator;
import java.security.KeyPair;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.AlgorithmParameters;
import java.security.NoSuchAlgorithmException;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.SignatureException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.InvalidParameterSpecException;
import javax.crypto.spec.PBEParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.SecretKeyFactory;
import javax.crypto.SecretKey;
import javax.crypto.Cipher;
import javax.crypto.EncryptedPrivateKeyInfo;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import java.io.IOException;

public class FNativeCrypto extends ReactContextBaseJavaModule {
  // TODO: Are these optimal?
  public static final int SALT_LEN_BYTES = 32;
  public static final int ITERATIONS = 250000;
  public static final String SIG_ALG = "SHA256WithRSA"; // Make sure this vibes with Fid.SIG_ALGORITHM

  // TODO: there's known issues with Java and PBES2 encryption
  // we're using unsafe PBES1 here because that's what works
  // there may be a workaround to get AES-256-CBC working to match Node/OpenSSL key encryption, but see:
  // https://bugs.openjdk.java.net/browse/JDK-8245169
  // https://bugs.openjdk.java.net/browse/JDK-8231581 
  // https://android.googlesource.com/platform/libcore/+/92f87a4de2f7c360a44f0195ef748874a1f4378e/support/src/test/java/libcore/java/security/StandardNames.java
  public static final String ALG = "PBEWithSHA1AndDESede";
  public static final String ALG_PARAMS = "PBEWithSHAAnd3-KEYTripleDES-CBC";
  public static final String ONE_TIME_KEY_CIPHER = "AES_256/CBC/PKCS5Padding";
  public static final String RSA_CIPHER = "RSA/ECB/OAEPwithSHA-1andMGF1Padding";

  FNativeCrypto(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return "FNativeCrypto";
  }

  public static byte[] hex_str_to_bytes(String s) {
    int len = s.length();
    byte[] data = new byte[len / 2];

    for (int i = 0; i < len; i += 2) {
      data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + 
        Character.digit(s.charAt(i + 1), 16));
    }

    return data;
  }

  // data as hex string
  // Returns an array representing a buffer
  // @ReactMethod
  // public void sha1(String data, Promise promise) {
  //  try {
  //    byte[] bytes = FNativeCrypto.hex_str_to_bytes(data);
  //    MessageDigest digest = MessageDigest.getInstance("SHA1");
  //    byte[] hash = digest.digest(bytes);
  //    WritableArray ret = new WritableNativeArray();

  //    for (byte b : hash) {
  //      ret.pushInt(b);
  //    }

  //    promise.resolve(ret);
  //  } catch (Exception e) {
  //    promise.reject(e);
  //  }
  // }

  // // data as hex string
  // // Returns an array representing a buffer
  // @ReactMethod
  // public void sha256(String data, Promise promise) {
  //  try {
  //    byte[] bytes = FNativeCrypto.hex_str_to_bytes(data);
  //    MessageDigest digest = MessageDigest.getInstance("SHA256");
  //    byte[] hash = digest.digest(bytes);
  //    WritableArray ret = new WritableNativeArray();

  //    for (byte b : hash) {
  //      ret.pushInt(b);
  //    }

  //    promise.resolve(ret);
  //  } catch (Exception e) {
  //    promise.reject(e);
  //  }
  // }

  // Returns an array of random values
  @ReactMethod
  public void randomBytes(double len, Promise promise) {
    try {
      // TODO: we can initialize SecureRandom better using getInstanceStrong and specifying an algo
      SecureRandom rnd = new SecureRandom();
      byte[] random_bytes = new byte[(int) len];
      rnd.nextBytes(random_bytes);
      WritableArray ret = new WritableNativeArray();

      for (byte b : random_bytes) {
        ret.pushInt(b);
      }

      promise.resolve(ret);
    } catch (Exception e) {
      promise.reject(e);
    }
  }

  // Returns a 2D array where arr[0] is the public key as DER byte array, spki encoded
  // and arr[1] is the priate key as DER byte array, encrypted using passphrase and pkcs8 encoded
  @ReactMethod
  public void generateRSAKeyPair(double modulus_len, String passphrase, Promise promise) 
    throws IOException, NoSuchAlgorithmException, InvalidAlgorithmParameterException,
    InvalidKeyException, NoSuchPaddingException, InvalidKeySpecException, BadPaddingException,
    IllegalBlockSizeException, InvalidParameterSpecException {

      try {
        final KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize((int) modulus_len);
        final KeyPair pair = kpg.generateKeyPair();

        // TODO: we can initialize SecureRandom better using getInstanceStrong and specifying an algo
        SecureRandom rnd = new SecureRandom();
        byte[] salt = new byte[FNativeCrypto.SALT_LEN_BYTES];
        rnd.nextBytes(salt);

        final PBEParameterSpec pbe_params_spec = new PBEParameterSpec(salt, FNativeCrypto.ITERATIONS);
        final PBEKeySpec kspec = new PBEKeySpec(passphrase.toCharArray());

        final SecretKeyFactory kf = SecretKeyFactory.getInstance(FNativeCrypto.ALG);
        final SecretKey pbe_key = kf.generateSecret(kspec);

        final Cipher cipher = Cipher.getInstance(FNativeCrypto.ALG);
        cipher.init(Cipher.ENCRYPT_MODE, pbe_key, pbe_params_spec);
        final byte[] encrypted = cipher.doFinal(pair.getPrivate().getEncoded());

        AlgorithmParameters alg_params = AlgorithmParameters.getInstance(FNativeCrypto.ALG_PARAMS);
        alg_params.init(pbe_params_spec);
        final EncryptedPrivateKeyInfo enc_privkey = new EncryptedPrivateKeyInfo(alg_params, encrypted);
      
        WritableArray pub = new WritableNativeArray();

        for (byte b : pair.getPublic().getEncoded()) {
          pub.pushInt(b);
        }

        WritableArray priv = new WritableNativeArray();

        for (byte b : enc_privkey.getEncoded()) {
          priv.pushInt(b);
        }
        
        WritableArray ret = new WritableNativeArray();
        ret.pushArray(pub);
        ret.pushArray(priv);
        promise.resolve(ret); 
      } catch (Exception e) {
        promise.reject(e);
      } 
  }

  // privkey as hex string
  // Returns an array representing the decrypted private key as buffer
  @ReactMethod
  public void decryptPrivateKeyRSA(String privkey, String passphrase, Promise promise)
    throws IOException, NoSuchAlgorithmException, InvalidKeySpecException,
    InvalidAlgorithmParameterException, NoSuchPaddingException, InvalidKeyException {

      try {
        // *** decrypt and construct private key
        final byte[] privkey_bytes = FNativeCrypto.hex_str_to_bytes(privkey);
        final PBEKeySpec kspec = new PBEKeySpec(passphrase.toCharArray());
        final EncryptedPrivateKeyInfo pkinfo = new EncryptedPrivateKeyInfo(privkey_bytes);

        final SecretKeyFactory skf = SecretKeyFactory.getInstance(pkinfo.getAlgName());
        final SecretKey pbe_key = skf.generateSecret(kspec);

        final Cipher cipher = Cipher.getInstance(pkinfo.getAlgName());
        cipher.init(Cipher.DECRYPT_MODE, pbe_key, pkinfo.getAlgParameters());

        final PKCS8EncodedKeySpec pkcs8_kspec = pkinfo.getKeySpec(cipher);
        final KeyFactory kf = KeyFactory.getInstance("RSA");
        final PrivateKey key = kf.generatePrivate(pkcs8_kspec);

        WritableArray ret = new WritableNativeArray();

        for (byte b : key.getEncoded()) {
          ret.pushInt(b);
        }

        promise.resolve(ret);
      } catch (Exception e) {
        promise.reject(e);
      }
  }

  // data as hex string, privkey as hex string
  // Returns an array representing the signature as buffer
  @ReactMethod
  public void signRSA(String data, String privkey, Promise promise)
    throws SignatureException, NoSuchAlgorithmException, InvalidAlgorithmParameterException,
    InvalidKeyException, InvalidKeySpecException, IOException, NoSuchPaddingException {
      
      try {
        // *** construct private key
        final byte[] privkey_bytes = FNativeCrypto.hex_str_to_bytes(privkey);
        
        PrivateKey key = KeyFactory.getInstance("RSA").generatePrivate(
          new PKCS8EncodedKeySpec(privkey_bytes)
        );

        // *** make sig
        final Signature private_sig = Signature.getInstance(FNativeCrypto.SIG_ALG);
        private_sig.initSign(key);
        private_sig.update(FNativeCrypto.hex_str_to_bytes(data));
        final byte[] sig = private_sig.sign();

        WritableArray ret = new WritableNativeArray();

        for (byte b : sig) {
          ret.pushInt(b);
        }

        promise.resolve(ret);
      } catch (Exception e) {
        promise.reject(e);
      }
  }

  // data as hex string, pubkey as hex string, sig as hex string
  // Returns a bool
  @ReactMethod
  public void verifyRSA(String data, String pubkey, String sig, Promise promise) 
    throws NoSuchAlgorithmException, InvalidKeySpecException, InvalidKeyException,
    SignatureException {
      
      try {
        // *** construct public key
        final byte[] pubkey_bytes = FNativeCrypto.hex_str_to_bytes(pubkey);
        
        final PublicKey key = KeyFactory.getInstance("RSA").generatePublic(
          new X509EncodedKeySpec(pubkey_bytes)
        );

        // *** verify sig
        final Signature public_sig = Signature.getInstance(FNativeCrypto.SIG_ALG);
        public_sig.initVerify(key);
        public_sig.update(FNativeCrypto.hex_str_to_bytes(data));
        final boolean ret = public_sig.verify(FNativeCrypto.hex_str_to_bytes(sig));
        promise.resolve(ret);
      } catch (Exception e) {
        promise.reject(e);
      }
  }

  // data as hex string, pubkey as hex string
  // Returns an array representing the encrypted data as buffer
  @ReactMethod
  public void publicEncryptRSA(String data, String pubkey, Promise promise) {
    try {
      final byte[] pubkey_bytes = FNativeCrypto.hex_str_to_bytes(pubkey);
      
      final PublicKey key = KeyFactory.getInstance("RSA").generatePublic(
        new X509EncodedKeySpec(pubkey_bytes)
      );
      
      final Cipher cipher = Cipher.getInstance(FNativeCrypto.RSA_CIPHER);
      cipher.init(Cipher.ENCRYPT_MODE, key);
      final byte[] data_bytes = FNativeCrypto.hex_str_to_bytes(data);
      final byte[] encrypted = cipher.doFinal(data_bytes);

      WritableArray ret = new WritableNativeArray();

      for (byte b : encrypted) {
        ret.pushInt(b);
      }

      promise.resolve(ret);
    } catch (Exception e) {
      promise.reject(e);
    } 
  }

  // data as hex string, privkey as hex string
  // Returns an array representing the encrypted data as buffer
  @ReactMethod
  public void privateDecryptRSA(String data, String privkey, Promise promise) {
    try {
      final byte[] privkey_bytes = FNativeCrypto.hex_str_to_bytes(privkey);
      
      final PrivateKey key = KeyFactory.getInstance("RSA").generatePrivate(
        new PKCS8EncodedKeySpec(privkey_bytes)
      );
      
      final Cipher cipher = Cipher.getInstance(FNativeCrypto.RSA_CIPHER);
      cipher.init(Cipher.DECRYPT_MODE, key);
      final byte[] data_bytes = FNativeCrypto.hex_str_to_bytes(data);
      final byte[] decrypted = cipher.doFinal(data_bytes);

      WritableArray ret = new WritableNativeArray();

      for (byte b : decrypted) {
        ret.pushInt(b);
      }

      promise.resolve(ret);
    } catch (Exception e) {
      promise.reject(e);
    } 
  }

  // data as hex string, one_time_key as hex string, iv as hex string
  // Returns an array representing the encrypted data as buffer
  @ReactMethod
  public void symmetricEncrypt(String data, String one_time_key, String iv, Promise promise) {
    try {
      final byte[] one_time_key_bytes = FNativeCrypto.hex_str_to_bytes(one_time_key);
      final SecretKey key = new SecretKeySpec(one_time_key_bytes, FNativeCrypto.ONE_TIME_KEY_CIPHER);

      final byte[] iv_bytes = FNativeCrypto.hex_str_to_bytes(iv);
      final IvParameterSpec ivspec = new IvParameterSpec(iv_bytes);
      final byte[] data_bytes = FNativeCrypto.hex_str_to_bytes(data);

      final Cipher cipher = Cipher.getInstance(FNativeCrypto.ONE_TIME_KEY_CIPHER);
      cipher.init(Cipher.ENCRYPT_MODE, key, ivspec);
      final byte[] encrypted = cipher.doFinal(data_bytes);

      WritableArray ret = new WritableNativeArray();

      for (byte b : encrypted) {
        ret.pushInt(b);
      }

      promise.resolve(ret);
    } catch (Exception e) {
      promise.reject(e);
    }
  }

  // data as hex string, one_time_key as hex string, iv as hex string
  // Returns an array representing the decrypted data as buffer
  @ReactMethod
  public void symmetricDecrypt(String data, String one_time_key, String iv, Promise promise) {
    try {
      final byte[] one_time_key_bytes = FNativeCrypto.hex_str_to_bytes(one_time_key);
      final SecretKey key =  new SecretKeySpec(one_time_key_bytes, FNativeCrypto.ONE_TIME_KEY_CIPHER);

      final byte[] iv_bytes = FNativeCrypto.hex_str_to_bytes(iv);
      final IvParameterSpec ivspec = new IvParameterSpec(iv_bytes);
      final byte[] data_bytes = FNativeCrypto.hex_str_to_bytes(data);

      final Cipher cipher = Cipher.getInstance(FNativeCrypto.ONE_TIME_KEY_CIPHER);
      cipher.init(Cipher.DECRYPT_MODE, key, ivspec);
      final byte[] decrypted = cipher.doFinal(data_bytes);

      WritableArray ret = new WritableNativeArray();

      for (byte b : decrypted) {
        ret.pushInt(b);
      }

      promise.resolve(ret);
    } catch (Exception e) {
      promise.reject(e);
    }
  }
}
