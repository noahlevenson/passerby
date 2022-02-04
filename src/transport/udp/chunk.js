"use strict";

const { generic_hash } = require("../../core/crypto.js");
const { SLICE_SZ, CHECKSUM_LEN, MAX_CHUNKS, new_slice, get_chunk_id, 
  get_checksum, get_nslices, get_slice_id, get_payload } = require("./slice.js");

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

class Chunk_sender {
  static WAIT_UNTIL_RETRY = 100;

  constructor() {
    this.send_map = new Map();
    this.acked_queue = [];
    this.chunk_queue = [];
    this.wr_ptr = 0;
  }

  static _make_slices(chunk, chunk_id) {
    let start = 0;
    let end = SLICE_SZ;
    let chopped = [];

    while (start < chunk.length) {
      chopped.push(chunk.slice(start, end));
      start = end;
      end += Math.min(SLICE_SZ, chunk.length - end);
    }

    const checksum = Chunk_sender._compute_checksum(chunk);

    return chopped.map((buf, i) => { 
      return new_slice({
        chunk_id: chunk_id,
        slice_id: i,
        nslices: chopped.length,
        checksum: checksum,
        payload: buf
      });
    });
  }

  static _compute_checksum(chunk) {
    return generic_hash(CHECKSUM_LEN, chunk);
  }

  /**
   * To reconcile the asynchronicity of inbound network events with the synchronicity of the
   * outbound network controller, we only update slice state on a tick
   */ 
  tick() {
    // Process the acks that arrived since the last tick
    this.acked_queue.forEach((tuple) => {
      const [chunk_id, acked, rinfo] = tuple;
      
      acked.forEach((state, i) => {
        if (state) {
          this.send_map.delete(this._get_key({
            chunk_id: chunk_id, 
            slice_id: i, 
            address: rinfo.address,
            port: rinfo.port
          }));
        }
      });
    });

    this.acked_queue = [];

    // Add the chunks that arrived since the last tick
    this.chunk_queue.forEach((tuple) => {
      const [chunk, rinfo, msg_timeout] = tuple;
      
      Chunk_sender._make_slices(chunk, this.wr_ptr).map(s => 
        new Send_state({slice: s, rinfo: rinfo, msg_timeout: msg_timeout}))
          .forEach((send_state, i) => {
            this.send_map.set(this._get_key({
              chunk_id: this.wr_ptr, 
              slice_id: i, 
              address: rinfo.address,
              port: rinfo.port
            }), send_state);
          });

      this._incr_wr_ptr();
    });

    this.chunk_queue = [];
  }

  /**
   * Size is guaranteed until the next tick
   */ 
  size() {
    return this.send_map.size;
  }

  /**
   * To avoid sending re-sending slices too quickly, this is worst case linear search over all the
   * slices that are currently in play...
   */ 
  next() {
    for (const [key, send_state] of this.send_map) {
      if (send_state.last_sent > Date.now() - Chunk_sender.WAIT_UNTIL_RETRY) {
        continue;
      }

      const max_tries = send_state.msg_timeout / Chunk_sender.WAIT_UNTIL_RETRY;
      
      if (send_state.tries < max_tries) {
        send_state.tries += 1;
        send_state.last_sent = Date.now();
      } else {
        this.send_map.delete(key);
      }

      return send_state;
    }

    return null;
  }

  set_acked({chunk_id, acked, rinfo}) {
    this.acked_queue.push([chunk_id, acked, rinfo]);
  }

  add({chunk, rinfo, msg_timeout} = {}) {
    this.chunk_queue.push([chunk, rinfo, msg_timeout]);
  }

  /** 
   * Perhaps you're wondering why we include network info in the key, given that network info is 
   * included as part of the Send_state fetched as the value? This is to simplify the process 
   * at ack time, since our slices are stored in a 1D data structure and we don't know where their 
   * parent chunks begin and end. In other words: given an ack referencing n slices, we don't want 
   * to fetch all n slices from the send_map just to compare each of their network info against the
   * network info of the ack sender, and then delete the appropriate slices. Instead, we include the 
   * network info in the key, skip the fetch and just idempotently delete each slice.
   */ 
  _get_key({chunk_id, slice_id, address, port} = {}) {
    return `${chunk_id}:${slice_id}:${address}:${port}`;
  }

  _incr_wr_ptr() {
    this.wr_ptr = this.wr_ptr < MAX_CHUNKS - 1 ? this.wr_ptr + 1 : 0;
  }
}

class Chunk_receiver {
  constructor() {
    this.recv_map = new Map();
  }

  add({slice, rinfo} = {}) {
    const chunk_id = get_chunk_id(slice);
    const checksum = get_checksum(slice);

    const key = this._get_key({
      chunk_id: chunk_id,
      checksum: checksum,
      address: rinfo.address,
      port: rinfo.port
    });

    let recv_buf = this.recv_map.get(key);

    if (!recv_buf) {
      recv_buf = new Recv_buf({
        chunk_id: chunk_id, 
        checksum: checksum, 
        nslices: get_nslices(slice)
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

class Recv_buf {
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
    this.slice_buf.set(get_slice_id(slice), slice);
    const acked = this._get_acked();

    // returns [acked array, reassembled || null]
    return [acked, acked.every(state => state) ? this._reassemble_unsafe() : null];
  }

  // Don't call this unless you're sure the chunk is complete!
  _reassemble_unsafe() {
    const payloads = Array.from(this.slice_buf.values()).map(slice => get_payload(slice));
    const chunk = new Uint8Array(SLICE_SZ * (this.nslices - 1) + payloads[payloads.length - 1].length);

    for (let i = 0; i < payloads.length; i += 1) {
      chunk.set(payloads[i], i * SLICE_SZ);
    }

    return chunk;
  }

  // TODO: this is too expensive, an easy optimization is to cache an array of acked bools
  _get_acked() {
    return Array.from(this.slice_buf.values()).map(slice => slice === null ? false : true);
  }
}

class Send_state {
  constructor({slice, rinfo, tries = 0, msg_timeout, last_sent = Number.NEGATIVE_INFINITY} = {}) {
    this.slice = slice;
    this.rinfo = rinfo;
    this.tries = tries;
    this.msg_timeout = msg_timeout;
    this.last_sent = last_sent;
  }
}

module.exports = { Chunk_sender, Chunk_receiver, Recv_buf, Send_state };