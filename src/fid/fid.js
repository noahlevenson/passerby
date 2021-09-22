/** 
* FID
* Identity management
* 
*
* 
*
*/ 

"use strict";

const { Fapp_cfg } = require("../fapp/fapp_cfg.js");
const cfg = require("../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Futil } = require("../futil/futil.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js");
const dict_adj_a = require("./dict/adj_4096_a.json");
const dict_adj_b = require("./dict/adj_4096_b.json");
const dict_noun = require("./dict/noun_4096.json");

class Fid {
  /**
   * TODO: HASH_SZ is the bit size of the hash function, but it's brittle that this varies 
   * independently of the hash function used in hash_cert()... 
   */ 

  static POW_ZERO_BITS = cfg.FID_POW_ZERO_BITS;
  static HASH_SZ = 256;
  static SYM_ADJ_A = dict_adj_a;
  static SYM_ADJ_B = dict_adj_b;
  static SYM_NOUN = dict_noun;
  static SYM_ADJ_A_BW = Futil.is_power2(dict_adj_a.length) ? 
    Math.log2(dict_adj_a.length) : Fid.dict_err();
  static SYM_ADJ_B_BW = Futil.is_power2(dict_adj_b.length) ? 
    Math.log2(dict_adj_b.length) : Fid.dict_err();
  static SYM_NOUN_BW = Futil.is_power2(dict_noun.length) ? 
    Math.log2(dict_noun.length) : Fid.dict_err();
  
  static dict_err() {
    throw new Error("Dictionary cardinality must be power of 2");
  }

  /**
   * Hashing a certificate currently means we hash over its pubkey and nonce, but this is insecure
   * temporary functionality. TODO: to bind all of a user's identity information to their proof of 
   * work, we must hash over all the properties of a Fid_pub. See Fkad_node._is_valid_storable()
   * for related discussion; this also touches the FDLT VM opcodes which validate POW...
   */ 
  static hash_cert(pubkey, nonce, str = false) {
    const h = Fcrypto.sha256(`${pubkey}${nonce}`);
    return str ? h : new Fbigint(h);
  }

  /**
   * Does 'hash' have sufficient leading zero bits to consider it a valid proof of work?
   */ 
  static is_valid_pow(hash, n_lead_zero_bits) {
    const offset = new Fbigint(Fid.HASH_SZ - n_lead_zero_bits);
    const mask = new Fbigint(Math.pow(2, n_lead_zero_bits) - 1).shift_left(offset);
    return hash.and(mask).shift_right(offset).equals(new Fbigint(0));
  }

  /**
   * Find a partial preimage for hash_cert(obj) which has n_lead_zero_bits. Callback function 'mod'
   * is used to modify obj after each attempt (e.g., to increment a nonce)
   */ 
  static find_partial_preimage(obj, mod, n_lead_zero_bits) {
    return new Promise((resolve, reject) => {
      while (!Fid.is_valid_pow(Fid.hash_cert(obj.pubkey, obj.nonce), n_lead_zero_bits)) {
        mod(obj);
      }

       resolve(obj);
    });
  }

  /**
   * Fetch the indices in the symbol dictionaries corresponding to Fid_pub 'cert'; returns null
   * if 'cert' does not have a valid proof of work
   */ 
  static get_symbol_indices(cert) {
    const hash = Fid.hash_cert(cert.pubkey, cert.nonce);
    
    if (!Fid.is_valid_pow(hash, Fid.POW_ZERO_BITS)) {
        return null; 
    }

    const mask_a = new Fbigint(Math.pow(2, Fid.SYM_ADJ_A_BW) - 1);
    
    const mask_b = new Fbigint(Math.pow(2, Fid.SYM_ADJ_B_BW) - 1).shift_left(
      new Fbigint(Fid.SYM_ADJ_A_BW)
    );
    
    const mask_c = new Fbigint(Math.pow(2, Fid.SYM_NOUN_BW) - 1).shift_left(
      new Fbigint(Fid.SYM_ADJ_A_BW + Fid.SYM_ADJ_B_BW)
    );
    
    const a = hash.and(mask_a);
    const b = hash.and(mask_b).shift_right(new Fbigint(Fid.SYM_ADJ_A_BW));
    const c = hash.and(mask_c).shift_right(new Fbigint(Fid.SYM_ADJ_A_BW + Fid.SYM_ADJ_B_BW));  
    return [parseInt(a.toString(10)), parseInt(b.toString(10)), parseInt(c.toString(10))];
  }
}

module.exports.Fid = Fid;
