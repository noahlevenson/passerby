/** 
* FAPP_BBOARD
* Free Food's torrent equivalent: a publicly
* sharable data structure which describes a network
* resource (restaurant food). A restaurant publishes
* a Fapp_bboard to make itself discoverable to diners
* 
*/ 

"use strict";

const { Fcrypto } = require("../fcrypto/fcrypto.js");

class Fapp_bboard {
  cred;
  img_cred_base64;
  form;
  last_active;
  sig;

  /**
   * cred: An object representing your credentialed identity; most likely a Fid_pub
   * img_cred_base64: Base64 encoded image credential supporting the identity data in cred
   * form: Order form; most likely an Fbuy_menu
   * last_active: Resource providers much touch this regularly, otherwise we'll consider them idle
   * sig: Cryptographic signature 
   */ 
  
  constructor({
    cred = null, 
    img_cred_base64 = null, 
    form = null, 
    last_active = Date.now(),
    sig = null
  }  = {}) {
    this.cred = cred; 
    this.img_cred_base64 = img_cred_base64; 
    this.form = form;
    this.last_active = last_active;
    this.sig = sig;
  }

  /**
   * TODO: write a static method to safely validate size and dimensions of img_cred_base64
   */ 

  /**
   * Add a cryptographic signature to a Fapp_bboard. Pass privkey as unencrypted hex string. 
   * Modifies 'fap_bboard', returning it with the signature in place
   */ 
  static async sign(fapp_bboard, privkey) {
    fapp_bboard.sig = null;
    
    const sig = await Fcrypto.sign(
      Buffer.from(JSON.stringify(fapp_bboard)), 
      Buffer.from(privkey, "hex")
    );

    fapp_bboard.sig = sig.toString("hex");
    return fapp_bboard;
  }

  /**
   * Verify the cryptographic signature present on a Fapp_bboard. Pass pubkey as hex string.
   * Returns a bool
   */ 
  static async verify(fapp_bboard, pubkey) {
    const copy = new Fapp_bboard(JSON.parse(JSON.stringify(fapp_bboard)));
    copy.sig = null;
    
    return await Fcrypto.verify(
      Buffer.from(JSON.stringify(copy)), 
      Buffer.from(pubkey, "hex"), 
      Buffer.from(fapp_bboard.sig, "hex")
    );
  }
}

module.exports.Fapp_bboard = Fapp_bboard;