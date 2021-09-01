/** 
* FTRANS_UDP_CHUNK_RECEIVER
* Abstracts the complexity of the chunk -> slice
* relationship; keeps state for incoming chunks
* 
* 
* 
* 
*/ 

"use strict";

const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");
const { Ftrans_udp_recv_buf } = require("./ftrans_udp_recv_buf.js");

class Ftrans_udp_chunk_receiver {
  recv_map;

  constructor() {
    this.recv_map = new Map();
  }

  add({slice, rinfo} = {}) {
    const chunk_id = Ftrans_udp_slice.get_chunk_id(slice);
    const checksum = Ftrans_udp_slice.get_checksum(slice);

    const key = this._get_key({
      chunk_id: chunk_id,
      checksum: checksum,
      address: rinfo.address,
      port: rinfo.port
    });

    let recv_buf = this.recv_map.get(key);

    if (!recv_buf) {
      recv_buf = new Ftrans_udp_recv_buf({
        chunk_id: chunk_id, 
        checksum: checksum, 
        nslices: Ftrans_udp_slice.get_nslices(slice)
      });

      this.recv_map.set(key, recv_buf);
    }

    const [acked, reassembled] = recv_buf.add(slice);

    if (reassembled !== null) {
      this.recv_map.delete(key);
    }

    return [acked, reassembled];
  }

  gc(t_expiry) {
    let n_stale = 0;

    for (const [key, recv_buf] of this.recv_map) {
      if (recv_buf.at < t_expiry) {
        this.recv_map.delete(key);
        n_stale += 1;
      }
    }

    return n_stale;
  }

  _get_key({chunk_id, checksum, address, port} = {}) {
    return `${chunk_id}:${checksum}:${address}:${port}`;
  }
}

module.exports.Ftrans_udp_chunk_receiver = Ftrans_udp_chunk_receiver;