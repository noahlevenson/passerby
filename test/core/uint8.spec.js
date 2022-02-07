"use strict";

const assert = require("assert");
const { compare, get_bit, read_uint16le, write_uint16le, read_uint16be, write_uint16be, 
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
 * get_bit()
 */ 
(() => {
  assert.throws(() => {
    get_bit("foo", 0, 0);
  });

  assert.throws(() => {
    get_bit([0xDE, 0, 0]);
  });

  assert.doesNotThrow(() => {
    get_bit(new Uint8Array([0xDE]), 0, 13);
  });

  assert.doesNotThrow(() => {
    get_bit(new Uint8Array([0xDE]), 4, 0);
  });

  const deadbeef = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);

  assert.strictEqual(get_bit(deadbeef, 0, 0), 0);
  assert.strictEqual(get_bit(deadbeef, 0, 1), 1);
  assert.strictEqual(get_bit(deadbeef, 0, 2), 1);
  assert.strictEqual(get_bit(deadbeef, 0, 3), 1);
  assert.strictEqual(get_bit(deadbeef, 0, 4), 1);
  assert.strictEqual(get_bit(deadbeef, 0, 5), 0);
  assert.strictEqual(get_bit(deadbeef, 0, 6), 1);
  assert.strictEqual(get_bit(deadbeef, 0, 7), 1);

  assert.strictEqual(get_bit(deadbeef, 1, 0), 1);
  assert.strictEqual(get_bit(deadbeef, 1, 1), 0);
  assert.strictEqual(get_bit(deadbeef, 1, 2), 1);
  assert.strictEqual(get_bit(deadbeef, 1, 3), 1);
  assert.strictEqual(get_bit(deadbeef, 1, 4), 0);
  assert.strictEqual(get_bit(deadbeef, 1, 5), 1);
  assert.strictEqual(get_bit(deadbeef, 1, 6), 0);
  assert.strictEqual(get_bit(deadbeef, 1, 7), 1);

  assert.strictEqual(get_bit(deadbeef, 2, 0), 0);
  assert.strictEqual(get_bit(deadbeef, 2, 1), 1);
  assert.strictEqual(get_bit(deadbeef, 2, 2), 1);
  assert.strictEqual(get_bit(deadbeef, 2, 3), 1);
  assert.strictEqual(get_bit(deadbeef, 2, 4), 1);
  assert.strictEqual(get_bit(deadbeef, 2, 5), 1);
  assert.strictEqual(get_bit(deadbeef, 2, 6), 0);
  assert.strictEqual(get_bit(deadbeef, 2, 7), 1);

  assert.strictEqual(get_bit(deadbeef, 3, 0), 1);
  assert.strictEqual(get_bit(deadbeef, 3, 1), 1);
  assert.strictEqual(get_bit(deadbeef, 3, 2), 1);
  assert.strictEqual(get_bit(deadbeef, 3, 3), 1);
  assert.strictEqual(get_bit(deadbeef, 3, 4), 0);
  assert.strictEqual(get_bit(deadbeef, 3, 5), 1);
  assert.strictEqual(get_bit(deadbeef, 3, 6), 1);
  assert.strictEqual(get_bit(deadbeef, 3, 7), 1);
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
 * read_uint16be()
 */ 
(() => {
  assert.throws(() => {
    read_uint16be("foo", 0);
  });

  assert.throws(() => {
    read_uint16be([0xDE, 0xAD], 0);
  });

  assert.throws(() => {
    read_uint16be(new Uint8Array([0xDE, 0xAD]), 1);
  });

  assert.throws(() => {
    read_uint16be(new Uint8Array([0xDE, 0xAD]), 2);
  });

  assert.throws(() => {
    read_uint16be(new Uint8Array([0xDE, 0xAD]), 3);
  });

  assert.throws(() => {
    read_uint16be(new Uint8Array([0xDE, 0xAD, 0xBE]), 2);
  });

  assert.doesNotThrow(() => {
    read_uint16be(new Uint8Array([0xDE, 0xAD]), 0);
  });

  const deadbeef = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);

  assert.strictEqual(read_uint16be(deadbeef, 0), 57005);
  assert.strictEqual(read_uint16be(deadbeef, 1), 44478);
  assert.strictEqual(read_uint16be(deadbeef, 2), 48879);
})();

/**
 * write_uint16be()
 */ 
(() => {
  assert.throws(() => {
    write_uint16be(31337, "foo bar", 0);
  });

  assert.throws(() => {
    write_uint16be(31337, [0xDE, 0xAD], 0);
  });

  assert.throws(() => {
    write_uint16be(31337, new Uint8Array(1), 0);
  });

  assert.throws(() => {
    write_uint16be(31337, new Uint8Array(16), 15);
  });

  assert.deepStrictEqual(
    write_uint16be(31337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 0),
    new Uint8Array([0x7A, 0x69, 0xBE, 0xEF])
  );

  assert.deepStrictEqual(
    write_uint16be(31337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 1),
    new Uint8Array([0xDE, 0x7A, 0x69, 0xEF])
  );

  assert.deepStrictEqual(
    write_uint16be(31337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 2),
    new Uint8Array([0xDE, 0xAD, 0x7A, 0x69])
  );

  assert.throws(() => {
    write_uint16be(31337, new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]), 3)
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