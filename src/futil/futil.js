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
const cfg = require("../../../libfood.json");
const { Fbigint } = Fapp_cfg.ENV[cfg.ENV] === Fapp_cfg.ENV.REACT_NATIVE ? 
  require("../ftypes/fbigint/fbigint_rn.js") : require("../ftypes/fbigint/fbigint_node.js");
// TODO: We currently have no React Native or browser implementation for 'net'
const net = require("net");

class Futil {
  // JSON serializer for JS Map type
  static map_to_json() {
    return JSON.stringify(Array.from(this.entries()));
  }

  // JSON deserializer for JS Map type
  static map_from_json(json) {
    const arr = JSON.parse(json);
    
    const deeply_parsed = arr.map((elem) => {
      return JSON.parse(JSON.stringify(elem), Fbigint._json_revive);
    });

    return new Map(deeply_parsed);
  }
  
  static is_power2(n) {
    return (n & (n - 1)) === 0;
  }

  static is_hex_str(str) {
    const reg = /^[A-Fa-f0-9]+$/;
    return reg.test(str);
  }

  // Normalize positive float f to an integer of bit depth b, where fmax is the largest poss value of f
  static float_to_normalized_int(f, fmax, b) {
    // TODO: Validate inputs and watch out for overflow
    const max = (Math.pow(2, b) - 1) / fmax;
    return Math.floor(f * max);
  }

  // Compute 2D Morton order linearization for positive values x and y, where b is the bit depth of 
  // each dimension (x becomes odd bits, y becomes even bits)
  static z_linearize_2d(x, y, b) {
    // TODO: Validate inputs
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

  // Invert z_linearize_2d
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

  // Compute the longest common prefix of an array of strings
  // if len = true, return the length of the lcp instead of the lcp itself
  // TODO: there's a more alpha way to do this with binary search
  static get_lcp(strings = [], len = false) {
    const shortest_len = Math.min(...strings.map(str => str.length));
    let i = 0;
    
    while (i < shortest_len) {
      if (!strings.every(str => str[i] === strings[0][i])) {
        break;
      }

      i += 1;
    }

    if (len) {
      return i;
    }

    return strings[0].substring(0, i);
  }

  // TODO: Validation
  // Network byte order (big endian)
  static int2buf16(int) {
    const buf = Buffer.alloc(2);

    buf[0] = 0xFF & (int >>> cfg.SYS_BYTE_WIDTH);
    buf[1] = 0xFF & int;

    return buf;
  }

  // Little endian addressing
  static get_bit(buffer, idx, off) {
    let mask = Buffer.alloc(1);

    mask[0] = 0x01;
    mask[0] <<= off;

    return (buffer[idx] & mask[0]) !== 0 ? 1 : 0;
  }

  static compare_buf(a, b) {
    if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
      return false
    }

    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i += 1) {
      if (a[i] != b[i]) {
        return false;
      }
    } 

    return true;
  }

  // TODO: Validation
  static ipv4str2buf32(str) {
    return Buffer.from(str.split(".").map((n) => { 
      return parseInt(n); 
    }));
  }

  // TODO: validation
  static buf322ipv4str(buf) {
    return `${buf[0]}.${buf[1]}.${buf[2]}.${buf[3]}`;
  }

  // TODO: Validation
  static ipv6str2buf128(str) {   
    const arr = str.split(":");
    const len = arr.length - 1;

    // It's an ipv4 mapped ipv6 address
    if (net.isIPv4(arr[len]) && arr[len - 1].toUpperCase() === "FFFF") {
      arr[len] = arr[len].split(".").map((n) => {
        return parseInt(n).toString(16).padStart(2, "0");
      }).join("");
    }

    const hs = arr.join("").padStart(16, "0");
    const buf = Buffer.alloc(16);

    let i = hs.length - 2;
    let j = buf.length - 1;

    while (i >= 0) {
      buf[j] = parseInt(hs.substring(i, i + 2), 16);
      i -= 2;
      j -= 1;
    }

    return buf;
  }

  // TODO: validation
  static buf1282ipv6str(buf) {
    // It's an ipv4 mapped ipv6 address
    if (buf.compare(Buffer.alloc(10), 0, 10, 0, 10) === 0 && 
      buf.compare(Buffer.from([0xFF, 0xFF]), 0, 2, 10, 12) === 0) {
      return `::FFFF:${Futil.buf322ipv4str(buf.slice(12, buf.length))}`;
    }

    let addr = "";

    for (let i = 0; i < buf.length; i += 2) {
      addr += `${buf[i].toString(16).padStart(2, "0")}${buf[i + 1].toString(16).padStart(2, "0")}:`;
    }

    // Just remove the last colon
    return addr.substring(0, addr.length - 1);
  }
}

module.exports.Futil = Futil;
