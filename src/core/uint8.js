"use strict";

/**
 * Deeply compare Uint8Array src to Uint8Array dest, return true if equal
 */ 
function compare(src, dest) {
  if (!ArrayBuffer.isView(src) || !ArrayBuffer.isView(dest)) {
    throw new TypeError("Argument error");
  }

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
  if (!ArrayBuffer.isView(src)) {
    throw new TypeError("Argument error");
  }

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
  if (!ArrayBuffer.isView(dest)) {
    throw new TypeError("Argument error");
  }

  if (dest.length < i + 2) {
    throw new RangeError("Destination is too short");
  }

  dest[i] = val & 0xFF;
  dest[i + 1] = (val >> 8) & 0xFF;
  return dest;
}

/**
 * Read 4 bytes from Uint8Array src starting at index i, interpret as a big endian signed 32-bit int
 */ 
function read_int32be(src, i) {
  if (!ArrayBuffer.isView(src)) {
    throw new TypeError("Argument error");
  }

  if (src.length < i + 4) {
    throw new RangeError("Source is too short");
  }

  let int = 0;

  for (let j = 3; j >= 0; j -= 1) {
    int |= src[i + j] << (j * 8);
  }

  return int;
}

/**
 * Write val to Uint8Array dest as a big endian signed 32-bit int, starting at index i
 * TODO: Catch overflow?
 */ 
function write_int32be(val, dest, i) {
  if (!ArrayBuffer.isView(dest)) {
    throw new TypeError("Argument error");
  }

  if (dest.length < i + 4) {
    throw new RangeError("Destination is too short");
  }

  for (let j = 3; j >= 0; j -= 1) {
    dest[i + j] = val >>> (j * 8) & 0xFF;
  }

  return dest;
}

module.exports = { compare, read_uint16le, write_uint16le, read_int32be, write_int32be };