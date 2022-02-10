"use strict";

const MSG_TYPE = {
  REQUEST: 0,
  PRE_PREPARE: 1,
  PREPARE: 2,
  COMMIT: 3,
  REPLY: 4
}

function message({type, data} = {}) {
  return {
    type: type,
    data: data
  };
}

function request_data({o, t = Date.now(), c} = {}) {
  return {
    o: o,
    t: t,
    c: c
  }
}

module.exports = { MSG_TYPE, message, request_data };