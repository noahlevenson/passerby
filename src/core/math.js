"use strict";

const { Bigboy } = require("./types/bigboy.js");

/**
 * Rescale positive float x to an integer computed over a range of b bits. xmax is the maximum
 * value in the domain of x. E.g., if x = 17.000634 and it represents a percentage, then xmax = 100
 * and b = 8 will rescale x to a byte-range unsigned integer.
 */ 
function rescale_float(x, xmax, b) {
  if (x < 0 || x > xmax) {
    throw new RangeError("Argument error");
  }

  const r = Math.round(x * (Math.pow(2, b) - 1) / xmax);

  if (r === Number.POSITIVE_INFINITY) {
    throw new RangeError("Overflow");
  }

  return r;
}

/**
 * Map abscissa x and ordinate y (as Bigboys) to one dimension using a Morton order curve. x and y
 * must be the same length in bits, and the returned value will be double that length.
 */
function morton_remap_2d(x, y) {
  if (x.length() !== y.length()) {
    throw new RangeError("Argument error");
  }

  const output_len = x.length() * 2;
  const n_bits = output_len * 8;
  let x_extended = Bigboy.from_hex_str({len: output_len, str: x.to_hex_str()});
  let y_extended = Bigboy.from_hex_str({len: output_len, str: y.to_hex_str()});
  let z_value = new Bigboy({len: output_len});
  let mask = new Bigboy({len: output_len, val: 0x01});

  for (let i = 0; i < n_bits; i += 1) {
    z_value = z_value.or((x_extended.and(mask)).shift_left(i));
    z_value = z_value.or((y_extended.and(mask)).shift_left(i + 1));
    mask = mask.shift_left(0x01);
  }

  return z_value;
}

/**
 * Inverse function to morton_remap_2d(): Given a z-value, return the abscissa and ordinate. Pass
 * z-value key as Bigboy. Returns Bigboys with a byte width equal to half the domain of the key. 
 * E.g., if the z-value is an 80-bit (10-byte) Bigboy, then the abscissa and ordinate will be 40-bit 
 * (5-byte) Bigboys. If key is an odd number of bytes, the abscissa and ordinate will size 
 * themselves to accommodate it -- e.g., a 24-bit (3-byte) z-value will be inverted into two 16-bit 
 * (2-byte) Bigboys. But you probably don't want your key to be an odd number of bytes, my friend.
 */ 
function morton_invert_2d(key) {
  let x = "";
  let y = "";

  [...key.to_base2_str()].forEach((char, i) => {
    if (i % 2 === 0) {
      y = `${y}${char}`;
    } else {
      x = `${x}${char}`;
    }
  });

  const len = Math.ceil(key.length() / 2);

  return {
    x: Bigboy.from_base2_str({len: len, str: x}), 
    y: Bigboy.from_base2_str({len: len, str: y})
  };
}

/**
 * Compute the longest common prefix over an array of strings. TODO: there's a binary search way...
 */ 
function get_lcp(strings = [""]) {
  const shortest = Math.min(...strings.map(str => str.length));
  let i = 0;

  while (strings.every(str => str[i] === strings[0][i]) && i < shortest) {
    i += 1;
  }

  return strings[0].substring(0, i);
}

module.exports = { rescale_float, morton_remap_2d, morton_invert_2d, get_lcp };