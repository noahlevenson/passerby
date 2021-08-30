/** 
* FTRANS_UDP_CHUNK_SENDER
* Abstracts the complexity of the chunk -> slice
* relationship; keeps state for outgoing chunks
* and provides a nice interface for accessing
* sendable slices in an orderly and efficient fashion
* 
* 
*/ 

"use strict";

const { Ftrans_udp_slice } = require("./ftrans_udp_slice.js");
const { Ftrans_udp_socketable } = require("./ftrans_udp_socketable.js");
const { Ftrans_udp_send_state } = require("./ftrans_udp_send_state.js");
const { Fcrypto } = require("../../../fcrypto/fcrypto.js");

/**
 * A few words about the chunk sender:
 * Maintaining state for outbound slices is an annoying job. If we imagine that all of our outbound
 * slices at any moment comprise a LIFO data structure, then the UDP network controller should
 * loop over that data structure, sending new slices in the order they were created, and resending
 * slices that had previously been sent but haven't yet been acked. Making things difficult is the
 * fact that slices may be acked, and therefore disqualified for sending, in arbitrary order; this
 * makes a data structure like a ring buffer much less appealing. Here we exploit the fact that 
 * JavaScript's Map type provides arbitrary O(1) insertions and deletions while also enabling 
 * us to iterate through the collection in insertion order; however, it's unclear whether our 
 * frequent insertions and deletions are resulting in time complexity degradation to something
 * closer to O(n) for some of these operations.
 */ 

class Ftrans_udp_chunk_sender {
  static MAX_RETRIES = 5;
  static WAIT_UNTIL_RETRY = 100;

  send_map;
  acked_queue;
  chunk_queue;
  wr_ptr;

  constructor() {
    this.send_map = new Map();
    this.acked_queue = [];
    this.chunk_queue = [];
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

  /**
   * To reconcile the asynchronicity of inbound network events with the synchronicity of the
   * outbound network controller, we only update slice state on a tick
   */ 
  tick() {
    // Process the acks that arrived since the last tick
    this.acked_queue.forEach((pair) => {
      const [chunk_id, acked] = pair;

      acked.forEach((state, i) => {
        if (state) {
          this.send_map.delete(this._get_key({chunk_id: chunk_id, slice_id: i}));
        }
      });
    });

    this.acked_queue = [];

    // Add the chunks that arrived since the last tick
    this.chunk_queue.forEach((pair) => {
      const [chunk, rinfo] = pair;

      Ftrans_udp_chunk_sender._make_slices(chunk, this.wr_ptr).map(s => 
        new Ftrans_udp_send_state({slice: s, rinfo: rinfo})).forEach((send_state, i) => {
          this.send_map.set(this._get_key({chunk_id: this.wr_ptr, slice_id: i}), send_state);
        });

      this._incr_wr_ptr();
    });

    this.chunk_queue = [];
  }

  /**
   * To avoid sending re-sending slices too quickly, this is worst case linear search over all the
   * slices that are currently in play...
   */ 
  next() {
    for (const [key, send_state] of this.send_map) {
      if (send_state.last_sent > Date.now() - Ftrans_udp_chunk_sender.WAIT_UNTIL_RETRY) {
        continue;
      }
      
      if (send_state.tries < Ftrans_udp_chunk_sender.MAX_RETRIES) {
        send_state.tries += 1;
        send_state.last_sent = Date.now();
      } else {
        this.send_map.delete(key);
      }

      return new Ftrans_udp_socketable({
        buf: send_state.slice, 
        address: send_state.rinfo.address, 
        port: send_state.rinfo.port
      });      
    }

    return null;
  }

  set_acked({chunk_id, acked}) {
    this.acked_queue.push([chunk_id, acked]); 
  }

  add({chunk, rinfo} = {}) {
    this.chunk_queue.push([chunk, rinfo]);
  }

  _get_key({chunk_id, slice_id} = {}) {
    return `${chunk_id}:${slice_id}`;
  }

  _incr_wr_ptr() {
    this.wr_ptr = this.wr_ptr < Ftrans_udp_slice.MAX_CHUNKS - 1 ? this.wr_ptr + 1 : 0;
  }
}

module.exports.Ftrans_udp_chunk_sender = Ftrans_udp_chunk_sender;