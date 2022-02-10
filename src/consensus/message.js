"use strict";

const MSG_TYPE = {
  REQUEST: 0,
  PRE_PREPARE: 1,
  PREPARE: 2,
  COMMIT: 3,
  REPLY: 4
}

function message({type, data, sig} = {}) {
  return {
    type: type,
    data: data,
    sig: sig
  };
}

function request_data({o, t = Date.now(), c} = {}) {
  return {
    o: o,
    t: t,
    c: c
  };
}

function reply_data({v, t, c, i, r} = {}) {
  return {
    v: v,
    t: t,
    c: c,
    i: i,
    r: r
  };
}

module.exports = { MSG_TYPE, message, request_data, reply_data };