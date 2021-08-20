/** 
* FTRANS_UDP_SEND_BUF
* A send buffer keeps state for all
* the slices which comprise one outbound chunk
* 
* 
* 
*/ 

"use strict";

const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");
const { Fcrypto } = require("../../../fcrypto/fcrypto.js");

class Ftrans_udp_send_buf {
  chunk_id;
  slice_buf
  nslices;
  rinfo;
  rd_ptr;

  // chunk as Buffer
  constructor({chunk, chunk_id, rinfo} = {}) {
    if (chunk.length > Ftrans_udp_slice.MAX_CHUNK_SZ) {
      throw new Error("chunk size may not exceed MAX_CHUNK_SZ");
    }

    this.chunk_id = chunk_id;
    this.slice_buf = new Map(Ftrans_udp_send_buf._make_slices(chunk, chunk_id).map((s, i) => {
      return [i, {slice: s, acked: false, tries: 0}];
    }));

    this.nslices = this.slice_buf.size;
    this.rinfo = rinfo;
    this.rd_ptr = 0;
  }

  static _compute_checksum(chunk) {
    return Buffer.from(Fcrypto.sha256(chunk).substring(0, Ftrans_udp_slice.CHECKSUM_LEN * 2), "hex");
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

    const checksum = Ftrans_udp_send_buf._compute_checksum(chunk);

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

  // Return the next slice in this buffer, null indicates end of buffer
  next() {
    if (this.rd_ptr < this.nslices) {
      const slice = this.slice_buf.get(this.rd_ptr);
      this.rd_ptr += 1;
      return slice;
    }

    return null;
  }

  // Reset the read pointer to 0
  reset() {
    this.rd_ptr = 0;
  }
}

module.exports.Ftrans_udp_send_buf = Ftrans_udp_send_buf;