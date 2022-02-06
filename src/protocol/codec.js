"use strict";

const { read_int32be, write_int32be } = require("../core/uint8.js");

/**
 * TODO: Everything here is just placeholder stubs while we finalize our wire format...
 * It's a 16-byte header with the type in byte 0, and the next 4 bytes are the message ID. 
 * There's no validation of message buf, header, or body, and there's no encryption!
 */ 

const MSG_TYPE = {
  HANDSHAKE: 0,
  IDENTIFY: 1,
  DHT: 2,
  CONSENSUS: 3,
  PSM: 4,
  APPLICATION: 5
};

const HEADER_LEN = 16;
const TYPE_LEN = 1;
const ID_LEN = 4;
const TYPE_I = 0;
const ID_I = TYPE_I + TYPE_LEN;

const ID_MAX = Math.pow(2, ID_LEN * 8) / 2 - 1;
const ID_MIN = 1;

function encode({body, type, msg_id, session_key} = {}) {
  if (typeof body !== "object" || !Object.values(MSG_TYPE).includes(type)) {
    throw new TypeError("Argument error");
  }

  const encoded_hdr = _encode_header({type: type, msg_id: msg_id});
  const encoded_body = _encode_body(body);
  return new Uint8Array([...encoded_hdr, ...encoded_body]);
}

function decode(msg_buf, session_key) {
  // TODO: if invalid, return null

  return {
    header: _decode_header(msg_buf.slice(0, HEADER_LEN)),
    body: _decode_body(msg_buf.slice(HEADER_LEN))
  };
}

function _encode_header({type, msg_id} = {}) {
  const header = new Uint8Array(HEADER_LEN);
  header[TYPE_I] = type;
  write_int32be(msg_id, header, ID_I);
  return header;
}

function _decode_header(hdr) {
  return {
    type: hdr[TYPE_I],
    msg_id: read_int32be(hdr, ID_I)
  };
}

function _encode_body(body) {
  return new TextEncoder().encode(JSON.stringify(body));
}

function _decode_body(body) {
  return JSON.parse(new TextDecoder().decode(body));
}

module.exports = { MSG_TYPE, ID_MAX, encode, decode };