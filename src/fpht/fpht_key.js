/** 
* FPHT_KEY
* Abstracts a PHT key
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

/**
 * Our PHT keys are multidimensional data mapped to one dimension using a space-filling curve, which
 * means that they are specially encoded integral values. The purpose of the Fpht_key class is to
 * enable rich keys which preserve the integral encoding but also store metadata. At the very least,
 * this enables collisions on the integral parts of keys.
 */ 

class Fpht_key {
  static SEP = ";";

  integral;
  meta;

  constructor({integral, meta = ""} = {}) {
    if (!(integral instanceof(Fbigint))) {
      throw new TypeError("Argument 'integral' must be Fbigint");
    }

    this.integral = integral;
    this.meta = meta;
  }

  static from(str) {
    const [integral, meta] = str.split(Fpht_key.SEP);
    return new Fpht_key({integral: new Fbigint(integral), meta: meta});
  }

  static to_str(key) {
    return `${key.integral.toString()}${Fpht_key.SEP}${key.meta}`;
  }

  static get_integral(key) {
    return key.integral;
  }
}

module.exports.Fpht_key = Fpht_key;