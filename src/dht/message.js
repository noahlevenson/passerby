"use strict";

const RPC = {
  PING: 0,
  STORE: 1,
  FIND_NODE: 2,
  FIND_VALUE: 3
};

const MSG_TYPE = {
  REQ: 0,
  RES: 1
};

const DATA_TYPE = {
  STRING: 0,
  NODE_LIST: 1,
  PAIR: 2,
  KEY: 3,
  VAL: 4
};

function message({rpc, from, data, type, id} = {}) {
  return {
    rpc: rpc,
    from: from,
    data: data,
    type: type,
    id: id
  };
}

function data({type, payload} = {}) {
  if (!Object.values(DATA_TYPE).includes(type) || !Array.isArray(payload) || payload.length < 1) {
    throw new Error("Argument error");
  }

  return {
    type: type,
    payload: payload
  };
}

module.exports = { RPC, MSG_TYPE, DATA_TYPE, message, data };