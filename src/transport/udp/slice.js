"use strict";

const { compare, read_uint16le, write_uint16le } = require("../../core/uint8.js");

/*
* A slice is a Uint8Array structured like so:
* [magic] 4 bytes (magic cookie to identify the packet)
* [version] 1 byte (protocol version)
* [chunk ID] 2 bytes (what chunk does this slice belong to?)
* [slice ID] 1 byte (what slice is this?)
* [n slices] 1 byte (how many slices total are there in this chunk?)
* [slice sz] 2 bytes (how many bytes is the payload? should equal SLICE_SZ except for the last slice)
* [checksum] 4 bytes (identifies the contents of the chunk that this slice belongs to)
* [payload] max of SLICE_SZ bytes 
*
* Deep thoughts about the checksum: The checksum was added to mitigate issues arising from a peer
* who tries to send us two different chunks with the same chunk ID. This could happen if a peer 
* sends us part of a chunk and then crashes -- and by rebooting, they reset their write pointer 
* before our garbage collector can clean their incomplete chunk from our recv buffer. This problem
* is essentially the same problem for which the TCP Quiet Time concept was invented; you can read a
* bit about that idea in RFC 793. To compute the checksum, we're currently just taking a 4 byte-hash 
* over the chunk. It'd be more rigorous and more expensive to compute a CRC. It'd be less rigorous 
* and less expensive to take the 4 low order bytes of the unix epoch time at which the chunk was created.
*/

const VERSION_LEN = 1;
const CHUNK_ID_LEN = 2;
const SLICE_ID_LEN = 1;
const NSLICES_LEN = 1;
const SLICE_SZ_LEN = 2;
const CHECKSUM_LEN = 4;
const MAGIC = Uint8Array.from([0xF2, 0x33, 0xF0, 0x0D]);
const MAGIC_LEN = MAGIC.length;
const VERSION = 1;
const MAGIC_I = 0;
const VERSION_I = MAGIC_I + MAGIC_LEN;
const CHUNK_ID_I = VERSION_I + VERSION_LEN;
const SLICE_ID_I = CHUNK_ID_I + CHUNK_ID_LEN;
const NSLICES_I = SLICE_ID_I + SLICE_ID_LEN;
const SLICE_SZ_I = NSLICES_I + NSLICES_LEN;
const CHECKSUM_I = SLICE_SZ_I + SLICE_SZ_LEN;
const PAYLOAD_I = CHECKSUM_I + CHECKSUM_LEN;

/**
 * Keep SLICE_SZ under your MTU; 512 and 1024 are prob OK. MAX_SLICES is bound by the width of 
 * [n slices], [slice ID] & [n slices], [acked] in the ack packet
 */ 
const SLICE_SZ = 1024;
const MAX_SLICES = 256;
const MAX_CHUNK_SZ = SLICE_SZ * MAX_SLICES;
const MAX_CHUNKS = 2 ** ((SLICE_ID_I - CHUNK_ID_I) * 8);
  
/**
 * chunk_id, slice_id, nslices as Numbers, checksum and payload as Uint8Array
 */ 
function new_slice({chunk_id, slice_id, nslices, checksum, payload} = {}) {
  const buf = new Uint8Array(PAYLOAD_I + payload.length);
  set_magic(buf);
  set_version(buf);
  set_chunk_id(buf, chunk_id);
  set_slice_id(buf, slice_id);
  set_nslices(buf, nslices);
  set_slice_sz(buf, payload.length);
  set_checksum(buf, checksum);
  set_payload(buf, payload);
  return buf;
}

function is_valid_slice(buf) {
  // Version number matches?
  if (buf[VERSION_I] !== VERSION) {
    return false;
  }

  // Size of slice seems OK?
  if (buf.length !== PAYLOAD_I + get_slice_sz(buf)) {
    return false;
  }

  // Magic cookie is OK?
  return compare(buf.slice(MAGIC_I, VERSION_I), MAGIC);
}

/**
 * TODO: Some of these gets and sets dangerously assume a safe Uint8Array length
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

function get_slice_id(buf) {
  return buf[SLICE_ID_I];
}

function set_slice_id(buf, val) {
  buf[SLICE_ID_I] = val;
  return buf;
}

function get_nslices(buf) {
  return buf[NSLICES_I];
}

function set_nslices(buf, val) {
  buf[NSLICES_I] = val;
  return buf;
}

function get_slice_sz(buf) {
  return read_uint16le(buf, SLICE_SZ_I);
}

function set_slice_sz(buf, val) {
  return write_uint16le(val, buf, SLICE_SZ_I);
}

function get_checksum(buf) {
  return buf.slice(CHECKSUM_I, PAYLOAD_I);
}

function set_checksum(buf, checksum_buf) {
  return buf.set(checksum_buf, CHECKSUM_I);
}

function get_payload(buf) {
  return buf.slice(PAYLOAD_I, PAYLOAD_I + get_slice_sz(buf));
}

function set_payload(buf, payload_buf) {
  return buf.set(payload_buf, PAYLOAD_I);
}

module.exports = { 
  MAX_CHUNK_SZ, SLICE_SZ, MAX_SLICES, CHECKSUM_LEN, MAX_CHUNKS, new_slice, is_valid_slice, get_magic, 
  set_magic, get_version, set_version, get_chunk_id, set_chunk_id, get_nslices, set_nslices, 
  get_slice_id, set_slice_id, get_checksum, set_checksum, get_payload, set_payload
};