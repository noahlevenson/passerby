"use strict";

const assert = require("assert");
const { Futil } = require("../../src/futil/futil.js");

(function is_power2(n) {
  const res1 = Futil.is_power2(128);
  assert.strictEqual(res1, true);

  const res2 = Futil.is_power2(9);
  assert.strictEqual(res2, false);

  const res3 = Futil.is_power2(512.1);
  assert.strictEqual(res3, false);

  const res4 = Futil.is_power2(2048.0);
  assert.strictEqual(res4, true);

  const res5 = Futil.is_power2(0.25);
  assert.strictEqual(res5, false);

  const res6 = Futil.is_power2(0);
  assert.strictEqual(res6, false);
})();


(function is_hex_str() {
  const res1 = Futil.is_hex_str("deadbeef");
  assert.strictEqual(res1, true);

  const res2 = Futil.is_hex_str("deadbeefg");
  assert.strictEqual(res2, false);

  const res3 = Futil.is_hex_str("f");
  assert.strictEqual(res3, true);

  const res4 = Futil.is_hex_str("fff");
  assert.strictEqual(res4, true);

  const res5 = Futil.is_hex_str("00001111222266abcdef");
  assert.strictEqual(res5, true);

  const res6 = Futil.is_hex_str("fk");
  assert.strictEqual(res6, false);

  const res7 = Futil.is_hex_str("");
  assert.strictEqual(res7, false);
})();