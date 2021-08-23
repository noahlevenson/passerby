/** 
* FTRANS_UDP_RECV_BUF
* A recv buffer keeps state for all
* the slices which comprise one inbound chunk
* 
* 
* 
*/ 

"use strict";

const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");

class Ftrans_udp_recv_buf {
  chunk_id;
  slice_buf;
  nslices;
  checksum;
  at;

  constructor({chunk_id, nslices, checksum} = {}) {
    this.chunk_id = chunk_id;
    this.slice_buf = new Map(new Array(nslices).fill().map((elem, i) => {
      return [i, null];
    }));

    this.nslices = nslices;
    this.checksum = checksum;
    this.at = Date.now();
  }

  add(slice) {
    this.slice_buf.set(Ftrans_udp_slice.get_slice_id(slice), slice);
  }

  is_complete() {
    return Array.from(this.slice_buf.values()).every(slice => slice !== null);
  }

  // Don't call this unless you're sure the chunk is complete!
  reassemble_unsafe() {
    return Buffer.concat(Array.from(this.slice_buf.values()).map(slice => 
      Ftrans_udp_slice.get_payload(slice)));
  }

  // TODO: this is too expensive, an easy optimization is to cache an array of acked bools
  get_acked() {
    return Array.from(this.slice_buf.values()).map(slice => slice === null ? false : true);
  }
}

module.exports.Ftrans_udp_recv_buf = Ftrans_udp_recv_buf;