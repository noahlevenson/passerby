"use strict";

let _logf = console.log;
let _errf = console.err;

function set_log(f) {
  if (typeof f !== "function") {
    throw new TypeError("Argument error");
  }

  _logf = f;
}

function set_err(f) {
  if (typeof f !== "function") {
    throw new TypeError("Argument error");
  }

  _errf = f;
}

function log(msg, tag = "LOG", lead_newln = false, trail_newln = false) {
  _logf(`[${tag}] ${lead_newln ? "\n" : ""} ${new Date().toLocaleString()} ` + 
    `${msg}${trail_newln ? "\n" : ""}`);
}

module.exports = { set_log, set_err, log };