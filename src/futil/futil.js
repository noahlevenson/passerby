/** 
* FUTIL
* Utility functions
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

class Futil {
  /**
   * Rescale positive float f to an integer of bit depth b, where fmax is the largest possible value
   * for f. TODO: validate inputs and catch overflow
   */
  static float_to_normalized_int(f, fmax, b) {
    const max = (Math.pow(2, b) - 1) / fmax;
    return Math.floor(f * max);
  }

  /**
   * Map 2D abscissa x and ordinate y to one dimension using a Morton order curve. b is the
   * bit depth to consider. Returns an Fbigint. TODO: validate inputs
   */ 
  static z_linearize_2d(x, y, b) {
    let xx = new Fbigint(x);
    let yy = new Fbigint(y);

    let l = new Fbigint(0);
    let mask = new Fbigint(0x01);

    for (let i = 0; i < b; i += 1) {
      l = l.or((xx.and(mask)).shift_left(new Fbigint(i)));
      l = l.or((yy.and(mask)).shift_left(new Fbigint(i + 1)));
      mask = mask.shift_left(new Fbigint(0x01));
    }

    return l;
  }

  /**
   * Inverse function to z_linearize_2d(); given some z-value as an Fbigint, return the abscissa 
   * and ordinate. b is the bit depth to consider.
   */ 
  static z_delinearize_2d(key, b) {
    let x = "";
    let y = "";

    [...key.to_bin_str(b)].forEach((char, i) => {
      if (i % 2 === 0) {
        y = `${y}${char}`;
      } else {
        x = `${x}${char}`;
      }
    });

    return {x: Fbigint.from_base2_str(x), y: Fbigint.from_base2_str(y)};
  }

  /**
   * Check whether a number is a power of 2
   */ 
  static is_power2(n) {
    return (n & (n - 1)) === 0;
  }

  /**
   * Check whether a string appears to be a valid hexidecimal value. This returns true for all
   * valid hex strings regardless of byte length, e.g. 'fff' is considered valid
   */ 
  static is_hex_str(str) {
    const reg = /^[A-Fa-f0-9]+$/;
    return reg.test(str);
  }

  /**
   * Compute the longest common prefix over an array of strings. TODO: there's a binary search way...
   */ 
  static get_lcp(strings = []) {
    const min_len = Math.min(...strings.map(str => str.length));
    let i = 0;
  
    while (i < min_len) {
      if (!strings.every(str => str[i] === strings[0][i])) {
        break;
      }

      i += 1;
    }

    return strings[0].substring(0, i);
  }

  /**
   * Fetch the bit from Buffer 'buf' at byte index 'idx' and bit offset 'off', little endian bit
   * addressing. Returns a bool.
   */ 
  static get_bit(buf, idx, off) {
    return (buf[idx] & (0x01 << off)) !== 0 ? true : false;
  }

  /**
   * Convenience method to write an unsigned integer to a 16-bit Buffer, big endian. TODO: validation
   */ 
  static wbuf_uint16be(uint) {
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(uint);
    return buf;
  }

  /**
   * Transform an IPv4 address string to a 32-bit Buffer. TODO: validation
   */ 
  static ipv4_str_to_buf32(str) {
    return Buffer.from(str.split(".").map(n => parseInt(n)));
  }

  /**
   * Inverse function to ipv4_str_to_buf32(); transform a 32-bit Buffer to an IPv4 address string.
   * TODO: validation
   */ 
  static buf32_to_ipv4_str(buf) {
    return `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}`;
  }

  /**
   * Transform an IPv6 address string to a 128-bit Buffer. TODO: this function was originally 
   * inherited when we ported over ministun (https://github.com/noahlevenson/ministun) to form the 
   * basis of FSTUN. The ministun implementations are pretty noob and rely on the Node.js net module,
   * which sucks. To be rewritten when we start testing IPv6 again...
   */ 
  static ipv6_str_to_buf128(str) {   
    throw new Error("Congratulations! You've discovered the missing ipv6_str_to_buf128 implementation");
  }

  /**
   * Inverse function to ipv6_str_to_buf128(); transform a 128-bit Buffer to an IPv6 address string.
   * Same TODO as above applies...
   */ 
  static buf128_to_ipv6_str(buf) {
    throw new Error("Congratulations! You've discovered the missing buf128_to_ipv6_str implementation");
  }
    
}

module.exports.Futil = Futil;
