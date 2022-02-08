"use strict";

function node_info({addr, port, node_id} = {}) {
  return {
    addr: addr,
    port: port,
    node_id: node_id
  };
}

function compare_info(info_a, info_b) {
  return info_a.addr === info_b.addr && info_a.port === info_b.port && 
    info_a.node_id.equals(info_b.node_id);
}

module.exports = { node_info, compare_info };