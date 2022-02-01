"use strict";

const assert = require("assert");
const { Bigboy } = require("../../../src/core/types/bigboy.js");

/**
 * Default constructor
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 1, val: 1.8});
  });

  assert.throws(() => {
    const foo = new Bigboy({len: 5, val: 4294967296});
  });

  assert.throws(() => {
    const foo = new Bigboy({len: 1, val: -3});
  });

  assert.throws(() => {
    const foo = new Bigboy({len: 1, val: 256});
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 1, val: 255});
  });

  assert.throws(() => {
    const foo = new Bigboy({len: 2, val: 65536});
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 2, val: 65535});
  });

  assert.throws(() => {
    const foo = new Bigboy({len: 4, val: 4294967296});
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 4, val: 4294967295});
  });

  const a = new Bigboy({len: 4, val: 4294967295});
  assert.deepStrictEqual(a._data, new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]));

  const b = new Bigboy({len: 3, val: 70000});
  assert.deepStrictEqual(b._data, new Uint8Array([0x70, 0x11, 0x01]));

  const c = new Bigboy({len: 1, val: 17});
  assert.deepStrictEqual(c._data, new Uint8Array([0x11]));

  const d = new Bigboy({len: 32, val: 31337});
  
  assert.deepStrictEqual(d._data, new Uint8Array([
    0x69, 0x7A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]));
})();

/**
 * from_hex_str()
 */
(() => {
  assert.throws(() => {
    const foo = Bigboy.from_hex_str({len: 1, str: "fff"});
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.from_hex_str({len: 1, str: "ff"});
  });

  assert.throws(() => {
    const foo = Bigboy.from_hex_str({len: 1, str: "FFF"});
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.from_hex_str({len: 1, str: "FF"});
  });

  assert.throws(() => {
    const foo = Bigboy.from_hex_str({len: 16, str: "fffffffffffffffffffffffffffffffff"});
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.from_hex_str({len: 16, str: "ffffffffffffffffffffffffffffffff"});
  });

  assert.throws(() => {
    const foo = Bigboy.from_hex_str({len: 16, str: "6666666666666666666666666666666666"});
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.from_hex_str({len: 16, str: "66666666666666666666666666666666"});
  });

  const a = Bigboy.from_hex_str({len: 8, str: "deadbeef"});
  assert.deepStrictEqual(a._data, new Uint8Array([0xEF, 0xBE, 0xAD, 0xDE, 0x00, 0x00, 0x00, 0x00]));

  const b = Bigboy.from_hex_str({len: 8, str: "deadbee"});
  assert.deepStrictEqual(b._data, new Uint8Array([0xEE, 0xDB, 0xEA, 0x0D, 0x00, 0x00, 0x00, 0x00]));

  const c = Bigboy.from_hex_str({len: 1, str: "a"});
  assert.deepStrictEqual(c._data, new Uint8Array([0x0A]));

  const d = Bigboy.from_hex_str({
    len: 32, 
    str: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
  });

  assert.deepStrictEqual(d._data, new Uint8Array([
    0xEF, 0xBE, 0xAD, 0xDE, 0xEF, 0xBE, 0xAD, 0xDE, 
    0xEF, 0xBE, 0xAD, 0xDE, 0xEF, 0xBE, 0xAD, 0xDE, 
    0xEF, 0xBE, 0xAD, 0xDE, 0xEF, 0xBE, 0xAD, 0xDE, 
    0xEF, 0xBE, 0xAD, 0xDE, 0xEF, 0xBE, 0xAD, 0xDE
  ]));
})();

/**
 * from_base2_str()
 */ 
(() => {
  assert.throws(() => {
    const foo = Bigboy.from_base2_str({len: 1, str: "111111111"});
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.from_base2_str({len: 1, str: "11111111"});
  });

  assert.throws(() => {
    const foo = Bigboy.from_base2_str({len: 1, str: "000000000"});
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.from_base2_str({len: 1, str: "00000000"});
  });

  assert.throws(() => {
    const foo = Bigboy.from_base2_str({
      len: 16, 
      str: "0101010101010101010101010101010101010101010101010101010101010101010101010101010101010" + 
      "10101010101010101010101010101010101010101010"
    });
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.from_base2_str({
      len: 16, 
      str: "0101010101010101010101010101010101010101010101010101010101010101010101010101010101010" + 
      "1010101010101010101010101010101010101010101"
    });
  });

  const a = Bigboy.from_base2_str({len: 8, str: "11011110101011011011111011101111"});
  assert.deepStrictEqual(a._data, new Uint8Array([0xEF, 0xBE, 0xAD, 0xDE, 0x00, 0x00, 0x00, 0x00]));

  const b = Bigboy.from_base2_str({len: 8, str: "1101111010101101101111101110"});
  assert.deepStrictEqual(b._data, new Uint8Array([0xEE, 0xDB, 0xEA, 0x0D, 0x00, 0x00, 0x00, 0x00]));

  const c = Bigboy.from_base2_str({len: 1, str: "1010"});
  assert.deepStrictEqual(c._data, new Uint8Array([0x0A]));

  const d = Bigboy.from_base2_str({len: 2, str: "1"});
  assert.deepStrictEqual(d._data, new Uint8Array([0x01, 0x00]));

  const e = Bigboy.from_base2_str({len: 3, str: "101"});
  assert.deepStrictEqual(e._data, new Uint8Array([0x05, 0x00, 0x00]));

  const f = Bigboy.from_base2_str({
    len: 16, 
    str: "0101010101010101010101010101010101010101010101010101010101010101010101010101010101010" + 
      "1010101010101010101010101010101010101010101"
  });

  assert.deepStrictEqual(f._data, new Uint8Array([
    0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 
    0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55
  ]));
})();

/**
 * unsafe_random()
 */ 
(() => {
  assert.doesNotThrow(() => {
    const foo = Bigboy.unsafe_random();
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.unsafe_random(7);
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.unsafe_random(1);
  });

  assert.doesNotThrow(() => {
    const foo = Bigboy.unsafe_random(33);
  });

  const foo = Bigboy.unsafe_random();
  assert.strictEqual(foo._data.length, Bigboy.DEFAULT_BYTE_WIDTH);
})();

/**
 * equals()
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 16});
    foo.equals(bar);
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 8});
    foo.equals(bar);
  });

  assert.strictEqual(true, new Bigboy({val: 0x31337}).equals(new Bigboy({val: 0x31337})));
  assert.strictEqual(false, new Bigboy({val: 0x31337}).equals(new Bigboy({val: 0x31336})));
  assert.strictEqual(true, new Bigboy({len: 3, val: 17}).equals(new Bigboy({len: 3, val: 17})));
  assert.strictEqual(false, new Bigboy({len: 3, val: 17}).equals(new Bigboy({len: 3, val: 9})));

  assert.strictEqual(
    true, 
    (new Bigboy({len: 64, val: 12345678})).equals(new Bigboy({len: 64, val: 12345678}))
  );

  assert.strictEqual(
    false, 
    (new Bigboy({len: 64, val: 12345673})).equals(new Bigboy({len: 64, val: 12345678}))
  );
})();

/**
 * greater()
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 16});
    foo.greater(bar);
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 8});
    foo.greater(bar);
  });

  assert.strictEqual(true, new Bigboy({val: 0x31337}).greater(new Bigboy({val: 0x31336})));
  assert.strictEqual(false, new Bigboy({val: 0x31337}).greater(new Bigboy({val: 0x31337})));
  assert.strictEqual(false, new Bigboy({val: 0x31337}).greater(new Bigboy({val: 0x31338})));
  assert.strictEqual(true, new Bigboy({len: 3, val: 17}).greater(new Bigboy({len: 3, val: 16})));
  assert.strictEqual(false, new Bigboy({len: 3, val: 17}).greater(new Bigboy({len: 3, val: 17})));
  assert.strictEqual(false, new Bigboy({len: 3, val: 17}).greater(new Bigboy({len: 3, val: 18})));

  assert.strictEqual(
    true, 
    (new Bigboy({len: 64, val: 12345678})).greater(new Bigboy({len: 64, val: 12345677}))
  );

  assert.strictEqual(
    false, 
    (new Bigboy({len: 64, val: 12345678})).greater(new Bigboy({len: 64, val: 12345678}))
  );

  assert.strictEqual(
    false, 
    (new Bigboy({len: 64, val: 12345678})).greater(new Bigboy({len: 64, val: 12345679}))
  );
})();

/**
 * less()
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 16});
    foo.less(bar);
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 8});
    foo.less(bar);
  });

  assert.strictEqual(true, new Bigboy({val: 0x31337}).less(new Bigboy({val: 0x31338})));
  assert.strictEqual(false, new Bigboy({val: 0x31337}).less(new Bigboy({val: 0x31337})));
  assert.strictEqual(false, new Bigboy({val: 0x31337}).less(new Bigboy({val: 0x31336})));
  assert.strictEqual(true, new Bigboy({len: 3, val: 17}).less(new Bigboy({len: 3, val: 18})));
  assert.strictEqual(false, new Bigboy({len: 3, val: 17}).less(new Bigboy({len: 3, val: 17})));
  assert.strictEqual(false, new Bigboy({len: 3, val: 17}).less(new Bigboy({len: 3, val: 16})));

  assert.strictEqual(
    true, 
    (new Bigboy({len: 64, val: 12345678})).less(new Bigboy({len: 64, val: 12345679}))
  );

  assert.strictEqual(
    false, 
    (new Bigboy({len: 64, val: 12345678})).less(new Bigboy({len: 64, val: 12345678}))
  );

  assert.strictEqual(
    false, 
    (new Bigboy({len: 64, val: 12345678})).less(new Bigboy({len: 64, val: 12345677}))
  );
})();

/**
 * greater_equal()
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 16});
    foo.greater_equal(bar);
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 8});
    foo.greater_equal(bar);
  });

  assert.strictEqual(true, new Bigboy({val: 0x31337}).greater_equal(new Bigboy({val: 0x31336})));
  assert.strictEqual(true, new Bigboy({val: 0x31337}).greater_equal(new Bigboy({val: 0x31337})));
  assert.strictEqual(false, new Bigboy({val: 0x31337}).greater_equal(new Bigboy({val: 0x31338})));
  assert.strictEqual(true, new Bigboy({len: 3, val: 17}).greater_equal(new Bigboy({len: 3, val: 16})));
  assert.strictEqual(true, new Bigboy({len: 3, val: 17}).greater_equal(new Bigboy({len: 3, val: 17})));
  assert.strictEqual(false, new Bigboy({len: 3, val: 17}).greater_equal(new Bigboy({len: 3, val: 18})));

  assert.strictEqual(
    true, 
    (new Bigboy({len: 64, val: 12345678})).greater_equal(new Bigboy({len: 64, val: 12345677}))
  );

  assert.strictEqual(
    true,

    (new Bigboy({len: 64, val: 12345678})).greater_equal(new Bigboy({len: 64, val: 12345678}))
  );

  assert.strictEqual(
    false, 
    (new Bigboy({len: 64, val: 12345678})).greater_equal(new Bigboy({len: 64, val: 12345679}))
  );
})();

/**
 * less_equal()
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 16});
    foo.less_equal(bar);
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 8});
    foo.less_equal(bar);
  });

  assert.strictEqual(true, new Bigboy({val: 0x31337}).less_equal(new Bigboy({val: 0x31338})));
  assert.strictEqual(true, new Bigboy({val: 0x31337}).less_equal(new Bigboy({val: 0x31337})));
  assert.strictEqual(false, new Bigboy({val: 0x31337}).less_equal(new Bigboy({val: 0x31336})));
  assert.strictEqual(true, new Bigboy({len: 3, val: 17}).less_equal(new Bigboy({len: 3, val: 18})));
  assert.strictEqual(true, new Bigboy({len: 3, val: 17}).less_equal(new Bigboy({len: 3, val: 17})));
  assert.strictEqual(false, new Bigboy({len: 3, val: 17}).less_equal(new Bigboy({len: 3, val: 16})));

  assert.strictEqual(
    true, 
    (new Bigboy({len: 64, val: 12345678})).less_equal(new Bigboy({len: 64, val: 12345679}))
  );

  assert.strictEqual(
    true, 
    (new Bigboy({len: 64, val: 12345678})).less_equal(new Bigboy({len: 64, val: 12345678}))
  );

  assert.strictEqual(
    false, 
    (new Bigboy({len: 64, val: 12345678})).less_equal(new Bigboy({len: 64, val: 12345677}))
  );
})();

/**
 * and()
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 16});
    foo.and(bar);
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 8});
    foo.and(bar);
  });

  assert.deepStrictEqual(
    new Bigboy({len: 8, val: 31337}).and(new Bigboy({len: 8, val: 0xDEADBEEF}))._data,
    new Uint8Array([0x69, 0x3A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 1, val: 18}).and(new Bigboy({len: 1, val: 3}))._data,
    new Uint8Array([2])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xF00D1234}).and(new Bigboy({len: 16, val: 0x7788}))._data,
    new Uint8Array([
      0x00, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );
})();

/**
 * or()
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 16});
    foo.or(bar);
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 8});
    foo.or(bar);
  });

  assert.deepStrictEqual(
    new Bigboy({len: 8, val: 31337}).or(new Bigboy({len: 8, val: 0xDEADBEEF}))._data,
    new Uint8Array([0xEF, 0xFE, 0xAD, 0xDE, 0x00, 0x00, 0x00, 0x00])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 1, val: 18}).or(new Bigboy({len: 1, val: 3}))._data,
    new Uint8Array([19])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xF00D1234}).or(new Bigboy({len: 16, val: 0x7788}))._data,
    new Uint8Array([
      0xBC, 0x77, 0x0D, 0xF0, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );
})();

/**
 * xor()
 */ 
(() => {
  assert.throws(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 16});
    foo.xor(bar);
  });

  assert.doesNotThrow(() => {
    const foo = new Bigboy({len: 8});
    const bar = new Bigboy({len: 8});
    foo.xor(bar);
  });

  assert.deepStrictEqual(
    new Bigboy({len: 8, val: 31337}).xor(new Bigboy({len: 8, val: 0xDEADBEEF}))._data,
    new Uint8Array([0x86, 0xC4, 0xAD, 0xDE, 0x00, 0x00, 0x00, 0x00])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 1, val: 18}).xor(new Bigboy({len: 1, val: 3}))._data,
    new Uint8Array([17])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xF00D1234}).xor(new Bigboy({len: 16, val: 0x7788}))._data,
    new Uint8Array([
      0xBC, 0x65, 0x0D, 0xF0, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );
})();

/**
 * shift_left()
 */ 
(() => {
  assert.throws(() => {
    new Bigboy({len: 16}).shift_left(-1);
  });

  assert.doesNotThrow(() => {
    new Bigboy({len: 16}).shift_left(0);
  });

  assert.doesNotThrow(() => {
    new Bigboy({len: 16}).shift_left(3000);
  });

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_left(1)._data,
    new Uint8Array([
      0x5A, 0xBD, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_left(2)._data,
    new Uint8Array([
      0xB4, 0x7A, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_left(3)._data,
    new Uint8Array([
      0x68, 0xF5, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_left(4)._data,
    new Uint8Array([
      0xD0, 0xEA, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_left(8)._data,
    new Uint8Array([
      0x00, 0xAD, 0xDE, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_left(12)._data,
    new Uint8Array([
      0x00, 0xD0, 0xEA, 0x0D, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_left(500)._data,
    new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );
})();

/**
 * shift_left()
 */ 
(() => {
  assert.throws(() => {
    new Bigboy({len: 16}).shift_right(-1);
  });

  assert.doesNotThrow(() => {
    new Bigboy({len: 16}).shift_right(0);
  });

  assert.doesNotThrow(() => {
    new Bigboy({len: 16}).shift_right(3000);
  });

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_right(1)._data,
    new Uint8Array([
      0x56, 0x6F, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_right(2)._data,
    new Uint8Array([
      0xAB, 0x37, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_right(3)._data,
    new Uint8Array([
      0xD5, 0x1B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_right(4)._data,
    new Uint8Array([
      0xEA, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD}).shift_right(8)._data,
    new Uint8Array([
      0xDE, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD0000}).shift_right(12)._data,
    new Uint8Array([
      0xD0, 0xEA, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );

  assert.deepStrictEqual(
    new Bigboy({len: 16, val: 0xDEAD0000}).shift_right(500)._data,
    new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ])
  );
})();

/**
 * get_bit()
 */
(() => {
  assert.throws(() => {
    new Bigboy({len: 16}).get_bit(-1);
  });

  assert.doesNotThrow(() => {
    new Bigboy({len: 16}).get_bit(0);
  });

  assert.doesNotThrow(() => {
    new Bigboy({len: 16}).get_bit(3000);
  });

  const foo = new Bigboy({len: 16, val: 555});
  assert.strictEqual(1, foo.get_bit(0));
  assert.strictEqual(1, foo.get_bit(1));
  assert.strictEqual(0, foo.get_bit(2));
  assert.strictEqual(1, foo.get_bit(3));
  assert.strictEqual(0, foo.get_bit(4));
  assert.strictEqual(1, foo.get_bit(5));
  assert.strictEqual(0, foo.get_bit(6));
  assert.strictEqual(0, foo.get_bit(7));
  assert.strictEqual(0, foo.get_bit(8));
  assert.strictEqual(1, foo.get_bit(9));
})();

/**
 * to_hex_str()
 */ 
(() => {
  assert.strictEqual(new Bigboy({len: 8, val: 0xDEAD}).to_hex_str(), "000000000000dead");
  assert.strictEqual(new Bigboy({len: 8, val: 0xDEA}).to_hex_str(), "0000000000000dea");
  assert.strictEqual(new Bigboy({len: 8, val: 0xDE}).to_hex_str(), "00000000000000de");
  assert.strictEqual(new Bigboy({len: 8, val: 0xD}).to_hex_str(), "000000000000000d");
  assert.strictEqual(new Bigboy({len: 3, val: 0xBEEF}).to_hex_str(), "00beef");
  assert.strictEqual(new Bigboy({len: 3, val: 0xBEE}).to_hex_str(), "000bee");
  assert.strictEqual(new Bigboy({len: 3, val: 0xBE}).to_hex_str(), "0000be");
  assert.strictEqual(new Bigboy({len: 3, val: 0xB}).to_hex_str(), "00000b");
})();

/**
 * to_base2_str()
 */ 
(() => {
  assert.strictEqual(
    new Bigboy({len: 8, val: 0xDEAD}).to_base2_str(), 
    "0000000000000000000000000000000000000000000000001101111010101101"
  )
  
  assert.strictEqual(
    new Bigboy({len: 8, val: 0xDEA}).to_base2_str(), 
    "0000000000000000000000000000000000000000000000000000110111101010"
    );
  
  assert.strictEqual(
    new Bigboy({len: 8, val: 0xDE}).to_base2_str(), 
    "0000000000000000000000000000000000000000000000000000000011011110"
    );
  
  assert.strictEqual(
    new Bigboy({len: 8, val: 0xD}).to_base2_str(), 
    "0000000000000000000000000000000000000000000000000000000000001101"
  );
  
  assert.strictEqual(
    new Bigboy({len: 3, val: 0xBEEF}).to_base2_str(), 
    "000000001011111011101111"
  );
  
  assert.strictEqual(
    new Bigboy({len: 3, val: 0xBEE}).to_base2_str(), 
    "000000000000101111101110"
  );
  
  assert.strictEqual(
    new Bigboy({len: 3, val: 0xBE}).to_base2_str(), 
    "000000000000000010111110"
  );
  
  assert.strictEqual(
    new Bigboy({len: 3, val: 0xB}).to_base2_str(), 
    "000000000000000000001011"
  );

  assert.strictEqual(
    new Bigboy({len: 3, val: 1}).to_base2_str(),
    "000000000000000000000001"
  );
})();