"use strict";

/**
 * TODO: Everything here is placeholder stubs (and unencrypted!) while we finalize our wire format...
 * It's a 16-byte header with the type in byte 0. Also notably absent is functionality to validate
 * a message buf, header, and body...
 */ 

const MSG_TYPE = {
  HANDSHAKE: 0,
  NAT: 1,
  DHT: 2,
  CONSENSUS: 3,
  PROTOCOL: 4
};

const HEADER_LEN = 16;
const TYPE_I = 0;

function encode({body, type} = {}) {
  if (typeof body !== "object" || !_is_valid_type(type)) {
    throw new TypeError("Argument error");
  }
  const encoded_hdr = _encode_header({type: type});
  const encoded_body = _encode_body(body);
  return new Uint8Array([...encoded_hdr, ...encoded_body]);
}

function decode(msg_buf) {
  return {
    header: _decode_header(msg_buf.slice(0, HEADER_LEN)),
    body: _decode_body(msg_buf.slice(HEADER_LEN))
  };
}

function _encode_header({type} = {}) {
  const header = new Uint8Array(HEADER_LEN);
  header[TYPE_I] = type;
  return header;
}

function _decode_header(hdr) {
  return {
    type: hdr[TYPE_I]
  };
}

function _encode_body(body) {
  return new TextEncoder().encode(JSON.stringify(body));
}

function _decode_body(body) {
  return JSON.parse(new TextDecoder().decode(body));
}

function _is_valid_type(type) {
  return Object.values(MSG_TYPE).includes(type);
}

module.exports = { MSG_TYPE, encode, decode };