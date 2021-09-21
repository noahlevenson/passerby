"use strict";

const assert = require("assert");
const { Futil } = require("../../src/futil/futil.js");

(function kway_merge_min() {
  const arrs = [
    [2, 7, 99, 109, 110, 110],
    [1, 8, 65, 100, 108, 109],
    [1, 7, 8, 101, 109, 112, 118]
  ];

  const res1 = Futil.kway_merge_min(arrs, vals => vals.indexOf(Math.min(...vals)), Number.POSITIVE_INFINITY);
  const res1_golden = [1, 1, 2, 7, 7, 8, 8, 65, 99, 100, 101, 108, 109, 109, 109, 110, 110, 112, 118];
  assert.strictEqual(res1.length, res1_golden.length);

  for (let i = 0; i < res1.length; i += 1) {
    assert.strictEqual(res1[i], res1_golden[i]);
  }
})();

(function is_power2() {
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

(function get_bit() {
  const res1 = Futil.get_bit(Buffer.from([0x04]), 0, 2);
  assert.strictEqual(res1, true);

  const res2 = Futil.get_bit(Buffer.from([0x04]), 0, 4);
  assert.strictEqual(res2, false);

  const res3 = Futil.get_bit(Buffer.from([0x04, 0x02]), 1, 1);
  assert.strictEqual(res3, true);

  const res4 = Futil.get_bit(Buffer.from([0x04, 0x02]), 1, 7);
  assert.strictEqual(res4, false);

  const res5 = Futil.get_bit(Buffer.from([0x04, 0x02, 0x01]), 2, 0);
  assert.strictEqual(res5, true);

  const res6 = Futil.get_bit(Buffer.from([0x04, 0x02, 0x01]), 2, 1);
  assert.strictEqual(res6, false);
})();

(function wbuf_uint16be() {
  const res1 = Futil.wbuf_uint16be(65535);
  assert.strictEqual(Buffer.compare(res1, Buffer.from([0xFF, 0xFF])), 0);

  const res2 = Futil.wbuf_uint16be(1000);
  assert.strictEqual(Buffer.compare(res2, Buffer.from([0x03, 0xE8])), 0);

  const res3 = Futil.wbuf_uint16be(16704);
  assert.strictEqual(Buffer.compare(res3, Buffer.from([0x41, 0x40])), 0);

  const res4 = Futil.wbuf_uint16be(3);
  assert.strictEqual(Buffer.compare(res4, Buffer.from([0x00, 0x03])), 0);

  const res5 = Futil.wbuf_uint16be(256);
  assert.strictEqual(Buffer.compare(res5, Buffer.from([0x01, 0x00])), 0);
})();