"use strict";

/**
 * Stubs for dynamic replica management. 'replica_id' must be your DHT node ID.
 */ 

class Repman {
  constructor(node_lookup_f, address, port, replica_id) {
    this.node_lookup_f = node_lookup_f;
    this.me = replica(address, port, replica_id);
  }

  async fetch_r(key) {
    const list = await this.node_lookup_f(key);
    return list.payload.map(node_info => replica(node_info.addr, node_info.port, node_info.node_id));
  }

  compute_f(r) {
    return Math.floor((r.length - 1) / 3);  
  }
  
  my_id() {
    return this.me.id;
  }
}

function replica(address, port, id) {
  return {
    address: address,
    port: port,
    id: id
  };
}

module.exports = { Repman };