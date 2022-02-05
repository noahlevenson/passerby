"use strict";

const assert = require("assert");
const { compare, read_uint16le, write_uint16le } = require("../../src/core/uint8.js");

/**
 * compare()
 */ 
(() => {
  assert.throws(() => {
    compare("foo", "foo");
  });

  assert.throws(() => {
    compare("foo", new Uint8Array([0xDE]));
  });

  assert.throws(() => {
    compare([0xDE], new Uint8Array([0xDE]));
  });

  assert.throws(() => {
    compare(new Uint8Array([0xDE]));
  });

  assert.doesNotThrow(() => {
    compare(new Uint8Array([0xDE]), new Uint8Array([0xDE, 0xAD]));
  });

  assert.strictEqual(compare(new Uint8Array([0xDE]), new Uint8Array([0xAD])), false);
  assert.strictEqual(compare(new Uint8Array([0xDE]), new Uint8Array([0xDE, 0xAD])), false);
  assert.strictEqual(compare(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), new Uint8Array([0xDE])), false);

  assert.strictEqual(
    compare(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])), 
    true
  );
})();

/**
 * read_uint16le()
 */ 
(() => {
  assert.throws(() => {
    read_uint16le("foo", 0);
  });

  assert.throws(() => {
    read_uint16le([0xDE, 0xAD], 0);
  });

  assert.throws(() => {
    read_uint16le(new Uint8Array([0xDE, 0xAD]), 1);
  });

  assert.throws(() => {
    read_uint16le(new Uint8Array([0xDE, 0xAD]), 2);
  });

  assert.throws(() => {
    read_uint16le(new Uint8Array([0xDE, 0xAD]), 3);
  });

  assert.throws(() => {
    read_uint16le(new Uint8Array([0xDE, 0xAD, 0xBE]), 2);
  });

  assert.doesNotThrow(() => {
    read_uint16le(new Uint8Array([0xDE, 0xAD]), 0);
  });

  const deadbeef = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);

  assert.strictEqual(read_uint16le(deadbeef, 0), 44510);
  assert.strictEqual(read_uint16le(deadbeef, 1), 48813);
  assert.strictEqual(read_uint16le(deadbeef, 2), 61374);
})();

/**
 * write_uint16le()
 */ 
(() => {
  assert.throws(() => {
    write_uint16le(31337, "foo bar", 0);
  });

  assert.throws(() => {
    write_uint16le(31337, [0xDE, 0xAD], 0);
  });

  assert.throws(() => {
    write_uint16le(31337, new Uint8Array(1), 0);
  });

  assert.throws(() => {
    write_uint16le(31337, new Uint8Array(16), 15);
  });

  assert.deepStrictEqual(
    write_uint16le(31337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 0),
    new Uint8Array([0x69, 0x7A, 0xBE, 0xEF])
  );

  assert.deepStrictEqual(
    write_uint16le(31337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 1),
    new Uint8Array([0xDE, 0x69, 0x7A, 0xEF])
  );

  assert.deepStrictEqual(
    write_uint16le(31337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 2),
    new Uint8Array([0xDE, 0xAD, 0x69, 0x7A])
  );

  assert.throws(() => {
    write_uint16le(31337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 3)
  });
})();