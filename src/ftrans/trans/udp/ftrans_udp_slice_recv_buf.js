/** 
* FTRANS_UDP_SLICE_RECV_BUF
* A slice recv buffer keeps state for all
* the slices which comprise one inbound chunk
* 
* 
* 
*/ 

"use strict";

const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");

class Ftrans_udp_slice_recv_buf {
  chunk_id;
  slice_buf;
  nslices;

  constructor({chunk_id, nslices} = {}) {
    this.chunk_id = chunk_id;
    this.slice_buf = new Map(new Array(nslices).fill().map((elem, i) => {
      return [i, null];
    }));

    this.nslices = nslices;
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
}

module.exports.Ftrans_udp_slice_recv_buf = Ftrans_udp_slice_recv_buf;