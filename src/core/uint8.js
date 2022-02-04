"use strict";

/**
 * Deeply compare Uint8Array src to Uint8Array dest, return true if equal
 */ 
function compare(src, dest) {
  if (src.length !== dest.length ) {
    return false;
  }

  for (let i = 0; i < src.length; i += 1) {
    if (src[i] !== dest[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Read 2 bytes from Uint8Array src starting at index i, interpret as a little endian unsigned 16-bit int
 */ 
function read_uint16le(src, i) {
  if (src.length < i + 2) {
    throw new RangeError("Source is too short");
  }

  return src[i] | (src[i + 1] << 8);
}

/**
 * Write val to Uint8Array dest as a little endian unsigned 16-bit int, starting at index i
 * TODO: Catch overflow?
 */ 
function write_uint16le(val, dest, i) {
  if (dest.length < i + 2) {
    throw new RangeError("Destination is too short");
  }

  dest[i] = val & 0xFF;
  dest[i + 1] = (val >> 8) & 0xFF;
  return dest;
}

module.exports = { compare, read_uint16le, write_uint16le };