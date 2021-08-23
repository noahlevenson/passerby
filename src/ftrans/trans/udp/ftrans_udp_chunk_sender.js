/** 
* FTRANS_UDP_CHUNK_SENDER
* Implements the Ftrans_udp_sender interface
* over an outbound chunk buffer, abstracting
* the complexity of state management for all 
* outbound chunks
* 
* 
*/ 

"use strict";

const { Ftrans_udp_sender } = require("./ftrans_udp_sender.js");
const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");
const { Ftrans_udp_socketable } = require("./ftrans_udp_socketable.js");
const { Ftrans_udp_send_state } = require("./ftrans_udp_send_state.js");
const { Fcrypto } = require("../../../fcrypto/fcrypto.js");

class Ftrans_udp_chunk_sender extends Ftrans_udp_sender {
  static MAX_RETRIES = 0;

  send_buf;
  wr_ptr;

  constructor() {
    super();
    this.send_buf = new Map();
    this.wr_ptr = 0;
  }

  static _make_slices(chunk, chunk_id) {
    let start = 0;
    let end = Ftrans_udp_slice.SLICE_SZ;
    let chopped = [];

    while (start < chunk.length) {
      chopped.push(chunk.slice(start, end));
      start = end;
      end += Math.min(Ftrans_udp_slice.SLICE_SZ, chunk.length - end);
    }

    const checksum = Ftrans_udp_chunk_sender._compute_checksum(chunk);

    return chopped.map((buf, i) => { 
      return Ftrans_udp_slice.new({
        chunk_id: chunk_id,
        slice_id: i,
        nslices: chopped.length,
        checksum: checksum,
        payload: buf
      });
    });
  }

  static _compute_checksum(chunk) {
    return Buffer.from(Fcrypto.sha256(chunk).substring(0, Ftrans_udp_slice.CHECKSUM_LEN * 2), "hex");
  }

  add({chunk, rinfo} = {}) {
    Ftrans_udp_chunk_sender._make_slices(chunk, this.wr_ptr).map(s => 
      new Ftrans_udp_send_state({slice: s, rinfo: rinfo})).forEach((send_state, i) => {
        this.send_buf.set(this.get_key({chunk_id: this.wr_ptr, slice_id: i}), send_state);
      });

    this._incr_wr_ptr();
  }

  next() {
    if (this.send_buf.size === 0) {
      return null;
    }

    const [key, send_state] = this.send_buf.entries().next().value;
    this.send_buf.delete(key);

    if (send_state.tries < Ftrans_udp_chunk_sender.MAX_RETRIES) {
      this.send_buf.set(key, send_state);
      send_state.tries += 1;
    }

    return new Ftrans_udp_socketable({
      buf: send_state.slice, 
      address: send_state.rinfo.address, 
      port: send_state.rinfo.port
    });
  }

  length() {
    return this.send_buf.size;
  }

  get_key({chunk_id, slice_id} = {}) {
    return `${chunk_id}:${slice_id}`;
  }

  set_acked({chunk_id, acked}) {
    acked.forEach((state, i) => {
      if (state) {
        this.send_buf.delete(this.get_key({chunk_id: chunk_id, slice_id: i}));
      }
    });
  }

  _incr_wr_ptr() {
    this.wr_ptr = this.wr_ptr < Ftrans_udp_slice.MAX_CHUNKS - 1 ? this.wr_ptr + 1 : 0;
  }
}

module.exports.Ftrans_udp_chunk_sender = Ftrans_udp_chunk_sender;