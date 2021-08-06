/** 
* FID
* Services for identity management,
* authentication, and verification
*
* 
*
*/ 

"use strict";

const { Fapp_cfg } = require("../fapp/fapp_cfg.js");
const { cfg } = require("../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
const { Futil } = require("../futil/futil.js");
const { Fcrypto } = require("../fcrypto/fcrypto.js");
const dict_adj_a = require("./dict/adj_4096_a.json");
const dict_adj_b = require("./dict/adj_4096_b.json");
const dict_noun = require("./dict/noun_4096.json");

class Fid {
  static SYM_ADJ_A = dict_adj_a;
  static SYM_ADJ_B = dict_adj_b;
  static SYM_NOUN = dict_noun;
  static SYM_ADJ_A_BW = Futil.is_power2(dict_adj_a.length) ? 
    Math.log2(dict_adj_a.length) : Fid.dict_err();
  static SYM_ADJ_B_BW = Futil.is_power2(dict_adj_b.length) ? 
    Math.log2(dict_adj_b.length) : Fid.dict_err();
  static SYM_NOUN_BW = Futil.is_power2(dict_noun.length) ? 
    Math.log2(dict_noun.length) : Fid.dict_err();
  // TODO: Remember to change HASH_SZ if you change the hash function in hash_cert!
  static HASH_SZ = 256;
  // TODO: set POW_LEAD_ZERO_BITS to a nontrivial value
  static POW_LEAD_ZERO_BITS = 3;
    
  static dict_err() {
    throw new Error("Dictionary cardinality must be power of 2");
  }

  // Hashing a cert means hashing the concatenation of its pubkey and its nonce
  static hash_cert(pubkey, nonce, str = false) {
    const h = Fcrypto.sha256(`${pubkey}${nonce}`);
    return str ? h : new Fbigint(h);
  }

  static is_valid_pow(hash, n_lead_zero_bits) {
    const offset = new Fbigint(Fid.HASH_SZ - n_lead_zero_bits);
    const mask = new Fbigint(Math.pow(2, n_lead_zero_bits) - 1).shift_left(offset);
    return hash.and(mask).shift_right(offset).equals(new Fbigint(0));
  }

  // Find a partial preimage for hash_cert(obj) which has n_lead_zero_bits
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
    
    const mask_b = new Fbigint(Math.pow(2, Fid.SYM_ADJ_B_BW) - 1).shift_left(
      new Fbigint(Fid.SYM_ADJ_A_BW)
    );
    
    const mask_c = new Fbigint(Math.pow(2, Fid.SYM_NOUN_BW) - 1).shift_left(
      new Fbigint(Fid.SYM_ADJ_A_BW + Fid.SYM_ADJ_B_BW)
    );
    
    // TODO: test this
    const a = hash.and(mask_a);
    const b = hash.and(mask_b).shift_right(new Fbigint(Fid.SYM_ADJ_A_BW));
    const c = hash.and(mask_c).shift_right(new Fbigint(Fid.SYM_ADJ_A_BW + Fid.SYM_ADJ_B_BW));  
    return [parseInt(a.toString(10)), parseInt(b.toString(10)), parseInt(c.toString(10))];
  }
}

module.exports.Fid = Fid;
