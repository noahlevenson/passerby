"use strict";

const { Bigboy } = require("../core/types/bigboy.js");

/**
 * Our PHT keys are multidimensional data mapped to one dimension using a space-filling curve, which
 * means that they are specially encoded integral values. The purpose of this key object is to
 * enable rich keys which preserve the integral encoding but also store metadata. At the very least,
 * this enables collisions on the integral parts of keys.
 */ 

const BIT_DOMAIN = 80;
const SEP = ";";

function key({integral, meta = ""} = {}) {
  return {
    integral: integral,
    meta: meta
  };
}

function from_str(str) {
  const [integral, meta] = str.split(SEP);
  return key({integral: Bigboy.from_hex_str({len: BIT_DOMAIN / 8, str: integral}), meta: meta});
}

function to_str(key) {
  return `${key.integral.to_hex_str()}${SEP}${key.meta}`;
}

function get_integral(key) {
  return key.integral;
}

module.exports = { BIT_DOMAIN, key, from_str, to_str, get_integral };