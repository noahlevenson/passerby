"use strict";

const { read_int32be, write_int32be } = require("../core/uint8.js");
const { Bigboy } = require("../core/types/bigboy.js");

/**
 * TODO: Everything here is just placeholder stubs while we finalize our wire format... It's a 
 * 16-byte header with the msg type in byte 0, body type in byte 1, and the next 4 bytes are the 
 * message generation number. Generation numbers exploit signed integers to create a req/res pattern:
 * the response to message i is message -i. There's no validation of message buf, header, or body, 
 * and there's no encryption!
 */ 

const MSG_TYPE = {
  HANDSHAKE: 0,
  WHOAMI: 1,
  DHT: 2,
  CONSENSUS: 3,
  PSM: 4,
  APPLICATION: 5
};

const BODY_TYPE = {
  BINARY: 0,
  JSON: 1
};

const HEADER_LEN = 16;
const TYPE_LEN = 1;
const BODY_TYPE_LEN = 1;
const GEN_LEN = 4;

const TYPE_I = 0;
const BODY_TYPE_I = TYPE_I + TYPE_LEN;
const GEN_I = BODY_TYPE_I + BODY_TYPE_LEN;

const GEN_MIN = 1;
const GEN_MAX = Math.pow(2, GEN_LEN * 8) / 2 - 1;

function is_gen_req(gen) {
  return gen > 0;
}

function get_gen_res(gen) {
  return -gen;
}

function encode({body, type, body_type, gen, session_key} = {}) {
  if (!Object.values(MSG_TYPE).includes(type) || !Object.values(BODY_TYPE).includes(body_type)) {
    throw new TypeError("Argument error");
  }

  const encoded_hdr = _encode_header({type: type, gen: gen, body_type: body_type});
  const encoded_body = _encode_body(body, body_type);
  return new Uint8Array([...encoded_hdr, ...encoded_body]);
}

function decode(msg_buf, session_key) {
  // TODO: if invalid, return null

  const header = _decode_header(msg_buf.slice(0, HEADER_LEN));

  return {
    header: header,
    body: _decode_body(msg_buf.slice(HEADER_LEN), header.body_type)
  };
}

function _encode_header({type, gen, body_type} = {}) {
  const header = new Uint8Array(HEADER_LEN);
  header[TYPE_I] = type;
  header[BODY_TYPE_I] = body_type;
  write_int32be(gen, header, GEN_I);
  return header;
}

function _decode_header(hdr) {
  return {
    type: hdr[TYPE_I],
    body_type: hdr[BODY_TYPE_I],
    gen: read_int32be(hdr, GEN_I)
  };
}

function _encode_body(body, body_type) {
  switch (body_type) {
    case BODY_TYPE.JSON:
      return new TextEncoder().encode(JSON.stringify(body));
      break;
    case BODY_TYPE.BINARY:
      return body;
  } 
}

function _decode_body(body, body_type) {
  switch (body_type) {
    case BODY_TYPE.JSON:
      return JSON.parse(new TextDecoder().decode(body), Bigboy.json_revive);
      break;
    case BODY_TYPE.BINARY:
      return body;
  }
}

module.exports = { MSG_TYPE, BODY_TYPE, GEN_MAX, is_gen_req, get_gen_res, encode, decode };