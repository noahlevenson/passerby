/** 
* FTRANS_UDP_CHUNK_SENDER
* Abstracts the complexity of the chunk -> slice
* relationship; keeps state for outgoing chunks
* and provides a nice interface for accessing
* sendable slices in an orderly fashion
* 
* 
*/ 

"use strict";

const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");
const { Ftrans_udp_socketable } = require("./ftrans_udp_socketable.js");
const { Ftrans_udp_send_state } = require("./ftrans_udp_send_state.js");
const { Fcrypto } = require("../../../fcrypto/fcrypto.js");

class Ftrans_udp_chunk_sender {
  static MAX_RETRIES = 5;
  static WAIT_UNTIL_RETRY = 100;

  send_buf;
  replacement_buf;
  wr_ptr;

  constructor() {
    this.send_buf = new Map();
    this.replacement_buf = new Map();
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


  /**
   * We exploit the fact that the JS Map type returns entries while preserving insertion order...
   * to "pop" the oldest value, we just delete it after access... to re-enqueue it, just set it 
   * again... this is how we get queue-like O(1) next() but also guarantee that we can delete acked
   * slices located anywhere in the data structure in something close to O(1)
   */  
  next() {
    if (this.send_buf.size === 0) {
      return null;
    }

    const [key, send_state] = this.send_buf.entries().next().value;
    this.send_buf.delete(key);

    if (send_state.tries < Ftrans_udp_chunk_sender.MAX_RETRIES) {
      send_state.tries += 1;
      send_state.last_sent = Date.now();
      this.replacement_buf.set(key, send_state);
    }

    return new Ftrans_udp_socketable({
      buf: send_state.slice, 
      address: send_state.rinfo.address, 
      port: send_state.rinfo.port
    });
  }

  /**
   * We want to enforce the following contract: if length() returns > 0, then a call to next() will
   * return an Ftrans_udp_socketable in O(1). This is made considerably more complex by the fact 
   * that we also want to enforce a minimum duration to wait before retransmitting a given slice.
   * Our solution is this hack: after transmission, slices which are eligible to be retransmitted
   * are transferred to a replacement buffer; each call to length() checks the time we last sent
   * the oldest slice in the replacement buffer, and, if said slice may now be retransmitted, 
   * silently transfers it back to the send buffer and returns the new length.
   */
  length() {
    if (this.replacement_buf.size > 0) {
      const [rep_key, rep_send_state] = this.replacement_buf.entries().next().value;

      if (rep_send_state.last_sent < Date.now() - Ftrans_udp_chunk_sender.WAIT_UNTIL_RETRY) {
        this.send_buf.set(rep_key, rep_send_state);
        this.replacement_buf.delete(rep_key);
      }
    }
  
    return this.send_buf.size;
  }

  get_key({chunk_id, slice_id} = {}) {
    return `${chunk_id}:${slice_id}`;
  }

  set_acked({chunk_id, acked}) {
    acked.forEach((state, i) => {
      if (state) {
        const key = this.get_key({chunk_id: chunk_id, slice_id: i});
        this.send_buf.delete(key);
        this.replacement_buf.delete(key);
      }
    });
  }

  _incr_wr_ptr() {
    this.wr_ptr = this.wr_ptr < Ftrans_udp_slice.MAX_CHUNKS - 1 ? this.wr_ptr + 1 : 0;
  }
}

module.exports.Ftrans_udp_chunk_sender = Ftrans_udp_chunk_sender;