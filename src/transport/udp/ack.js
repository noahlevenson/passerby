"use strict";

const { MAX_SLICES } = require("./slice.js");
const { compare, read_uint16le, write_uint16le } = require("../../core/uint8.js");

/*
* An ack is a Uint8Array structured like so:
* [magic] 4 bytes (magic cookie to identify the packet)
* [version] 1 byte (protocol version)
* [chunk ID] 2 bytes (what chunk is this ack referencing?)
* [n slices] 1 byte (how many slices total are there in the chunk referenced by this ack?)
* [acked] MAX_SLICES / 8 bytes aka 1 bit per slice (which slices have we acknowledged so far?)
*/

const VERSION_LEN = 1;
const CHUNK_ID_LEN = 2;
const NSLICES_LEN = 1;
const ACKED_LEN = MAX_SLICES / 8;
const MAGIC = Uint8Array.from([0xFE, 0xED, 0xFA, 0xCE]);
const MAGIC_LEN = MAGIC.length;
const VERSION = 1;
const MAGIC_I = 0;
const VERSION_I = MAGIC_I + MAGIC_LEN;
const CHUNK_ID_I = VERSION_I + VERSION_LEN;
const NSLICES_I = CHUNK_ID_I + CHUNK_ID_LEN;
const ACKED_I = NSLICES_I + NSLICES_LEN;
const ACK_SZ = ACKED_I + ACKED_LEN;

/**
 * chunk_id, nslices as Numbers, acked as array of bools
 */ 
function new_ack({chunk_id, nslices, acked} = {}) {
  const buf = new Uint8Array(ACKED_I + ACKED_LEN);
  set_magic(buf);
  set_version(buf);
  set_chunk_id(buf, chunk_id);
  set_nslices(buf, nslices);
  set_acked(buf, acked);
  return buf;
}

function is_valid_ack(buf) {
  // Version number matches?
  if (buf[VERSION_I] !== VERSION) {
    return false;
  }

  // Size of ack seems OK?
  if (buf.length !== ACKED_I + ACKED_LEN) {
    return false;
  }

  // Magic cookie is OK?
  return compare(buf.slice(MAGIC_I, VERSION_I), MAGIC);
}

/**
 * TODO: Some of these gets and sets dangerously assume a safe Buffer length
 */ 

function get_magic(buf) {
  return buf.slice(MAGIC_I, VERSION_I);
}

function set_magic(buf) {
  return buf.set(MAGIC, MAGIC_I);
}

function get_version(buf) {
  return buf[VERSION_I];
}

function set_version(buf) {
  buf[VERSION_I] = VERSION;
  return buf;
}

function get_chunk_id(buf) {
  return read_uint16le(buf, CHUNK_ID_I);
}

function set_chunk_id(buf, val) {
  return write_uint16le(val, buf, CHUNK_ID_I);
}

function get_nslices(buf) {
  return buf[NSLICES_I];
}

function set_nslices(buf, val) {
  buf[NSLICES_I] = val;
  return buf;
}

/**
 * Returns an array of bools with a length equal to [n slices]
 */ 
function get_acked(buf) {
  const acked = [];

  for (let i = 0; i < get_nslices(buf); i += 1) {
    acked.push((buf[ACKED_I + Math.floor(i / 8)] >> (i % 8)) & 0x01 === 0x01 ? true : false);
  }
  
  return acked;
}

/**
 * arr as an array of bools with a length equal to [n slices], we hope
 */ 
function set_acked(buf, arr) {
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i]) {
      buf[ACKED_I + Math.floor(i / 8)] |= (0x01 << (i % 8));
    }
  }

  return buf;
}

module.exports = { 
  new_ack, is_valid_ack, get_magic, set_magic, get_version, set_version, get_chunk_id, set_chunk_id,
  get_nslices, set_nslices, get_acked, set_acked
};