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
  
// TODO: when computing sig over a pre-prepare, do NOT sign over m
function pre_prepare_data({v, n, d, m} = {}) {
  return {
    v: v,
    n: n,
    d: d,
    m: m
  };
}

function prepare_data({v, n, d, i} = {}) {
  return {
    v: v,
    n: n,
    d: d,
    i: i
  };
}

function commit_data({v, n, d, i} = {}) {
  return {
    v: v,
    n: n,
    d: d,
    i: i
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

module.exports = { MSG_TYPE, message, request_data, pre_prepare_data, prepare_data, commit_data, 
  reply_data };