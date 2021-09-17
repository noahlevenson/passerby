"use strict";

const assert = require("assert");
const { Futil } = require("../../src/futil/futil.js");

(function is_hex_str() {
  const res1 = Futil.is_hex_str("deadbeef");
  assert.strictEqual(res1, true);

  const res2 = Futil.is_hex_str("deadbeefg");
  assert.strictEqual(res2, false);

  const res3 = Futil.is_hex_str("f");
  assert.strictEqual(res3, false);

  const res4 = Futil.is_hex_str("fff");
  assert.strictEqual(res4, false);

  const res5 = Futil.is_hex_str("00001111222266abcdef");
  assert strictEqual(res5, true);
})();