"use strict";

const assert = require("assert");
const { compare, read_uint16le, write_uint16le, 
  read_int32be, write_int32be } = require("../../src/core/uint8.js");

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

/**
 * read_int32be()
 */ 
(() => {
  assert.throws(() => {
    read_int32be("food", 0);
  });

  assert.throws(() => {
    read_int32be([0xDE, 0xAD, 0xBE, 0xEF], 0);
  });

  assert.throws(() => {
    read_int32be(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 1);
  });

  assert.throws(() => {
    read_int32be(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 2);
  });

  assert.throws(() => {
    read_int32be(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 3);
  });

  assert.throws(() => {
    read_int32be(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xDE]), 2);
  });

  assert.doesNotThrow(() => {
    read_int32be(new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 0);
  });

  const deadbeefcafebabe = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE]);

  assert.strictEqual(read_int32be(deadbeefcafebabe, 0), -272716322);
  assert.strictEqual(read_int32be(deadbeefcafebabe, 1), -890257747);
  assert.strictEqual(read_int32be(deadbeefcafebabe, 2), -20254786);
  assert.strictEqual(read_int32be(deadbeefcafebabe, 3), -1157707025);
  assert.strictEqual(read_int32be(deadbeefcafebabe, 4), -1095041334);
})();

/**
 * write_int32be()
 */ 
(() => {
  assert.throws(() => {
    write_int32be(3133731337, "foo bar", 0);
  });

  assert.throws(() => {
    write_int32be(3133731337, [0xDE, 0xAD, 0xBE, 0xEF], 0);
  });

  assert.throws(() => {
    write_int32be(3133731337, new Uint8Array(3), 0);
  })

  assert.throws(() => {
    write_int32be(3133731337, new Uint8Array(16), 13);
  });

  assert.deepStrictEqual(
    write_int32be(3133731337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE]), 0),
    new Uint8Array([0x09, 0xF2, 0xC8, 0xBA, 0xCA, 0xFE, 0xBA, 0xBE])
  );

  assert.deepStrictEqual(
    write_int32be(3133731337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE]), 1),
    new Uint8Array([0xDE, 0x09, 0xF2, 0xC8, 0xBA, 0xFE, 0xBA, 0xBE])
  );

  assert.deepStrictEqual(
    write_int32be(3133731337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE]), 2),
    new Uint8Array([0xDE, 0xAD, 0x09, 0xF2, 0xC8, 0xBA, 0xBA, 0xBE])
  );

  assert.deepStrictEqual(
    write_int32be(3133731337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE]), 3),
    new Uint8Array([0xDE, 0xAD, 0xBE, 0x09, 0xF2, 0xC8, 0xBA, 0xBE])
  );

  assert.deepStrictEqual(
    write_int32be(3133731337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE]), 4),
    new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x09, 0xF2, 0xC8, 0xBA])
  );

  assert.throws(() => {
    write_int32be(3133731337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE]), 5);
  });
})();