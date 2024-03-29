"use strict";

const assert = require("assert");
const { Bigboy } = require("../../src/core/types/bigboy.js");
const M = require("../../src/core/math.js");

/**
 * rescale_float()
 */ 
(() => {
  assert.throws(() => {
    M.rescale_float(-1.5, 100, 40)
  });

  assert.throws(() => {
    M.rescale_float(17.5, 15, 40);
  });

  assert.throws(() => {
    M.rescale_float(50, 100, 5000);
  });

  assert.doesNotThrow(() => {
    M.rescale_float(17.5, 100, 40);
  });

  assert.doesNotThrow(() => {
    M.rescale_float(0, 100, 40);
  });

  assert.strictEqual(M.rescale_float(127, 255, 8), 127);
  assert.strictEqual(M.rescale_float(100, 100, 8), 255);
  assert.strictEqual(M.rescale_float(0.25, 2, 8), 32);
  assert.strictEqual(M.rescale_float(0.25, 2, 32), 536870912);
})();

/**
 * morton_remap_2d()
 */ 
(() => {
  assert.throws(() => {
    M.morton_remap_2d(255, 255);
  });

  assert.throws(() => {
    M.morton_remap_2d(255);
  })

  assert.throws(() => {
    M.morton_remap_2d(new Bigboy({len: 2, val: 31337}), 31337);
  });

  assert.throws(() => {
    M.morton_remap_2d(new Bigboy({len: 2, val: 31337}), new Bigboy({len: 1, val: 31337}));
  });

  assert.doesNotThrow(() => {
    M.morton_remap_2d(new Bigboy({len: 1, val: 7}), new Bigboy({len: 1, val: 7}));
  });

  assert.deepStrictEqual(
    M.morton_remap_2d(new Bigboy({len: 1, val: 0x0F}), new Bigboy({len: 1, val: 0x0F}))._data, 
    new Uint8Array([0xFF, 0x00])
  );
  
  assert.deepStrictEqual(
    M.morton_remap_2d(new Bigboy({len: 1, val: 0xFF}), new Bigboy({len: 1, val: 0x00}))._data, 
    new Uint8Array([0x55, 0x55])
  );
 
  assert.deepStrictEqual(
    M.morton_remap_2d(new Bigboy({len: 2, val: 0xFFFF}), new Bigboy({len: 2, val: 0x0000}))._data, 
    new Uint8Array([0x55, 0x55, 0x55, 0x55])
  );

  assert.deepStrictEqual(
    M.morton_remap_2d(new Bigboy({len: 4, val: 0xFF}), new Bigboy({len: 4, val: 0x00}))._data, 
    new Uint8Array([0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  );

  assert.deepStrictEqual(
    M.morton_remap_2d(new Bigboy({len: 4, val: 0x5555}), new Bigboy({len: 4, val: 0x5555}))._data, 
    new Uint8Array([0x33, 0x33, 0x33, 0x33, 0x00, 0x00, 0x0, 0x00]));
})();

/**
 * morton_invert_2d()
 */ 
(() => {
  const a = M.morton_invert_2d(new Bigboy({len: 2, val: 0x5555}));
  assert.deepStrictEqual(a.x._data, new Uint8Array([0xFF]));
  assert.deepStrictEqual(a.y._data, new Uint8Array([0x00]));

  const b = M.morton_invert_2d(new Bigboy({len: 4, val: 0x33333333}));
  assert.deepStrictEqual(b.x._data, new Uint8Array([0x55, 0x55]));
  assert.deepStrictEqual(b.y._data, new Uint8Array([0x55, 0x55]));

  const c = M.morton_invert_2d(new Bigboy({len: 1, val: 0x0F}));
  assert.deepStrictEqual(c.x._data, new Uint8Array([0x03]));
  assert.deepStrictEqual(c.y._data, new Uint8Array([0x03]));
})();

/**
 * get_lcp()
 */ 
(() => {
  assert.doesNotThrow(() => {
    const foo = M.get_lcp();
  });

  assert.strictEqual(M.get_lcp(), "");
  assert.strictEqual(M.get_lcp(["beard", "bear", "be"]), "be");
  assert.strictEqual(M.get_lcp(["beard", "be", "bear"]), "be");
  assert.strictEqual(M.get_lcp(["be", "beard", "bear"]), "be");
  assert.strictEqual(M.get_lcp(["12345676890", "12345", "12345", "123456"]), "12345");
  assert.strictEqual(M.get_lcp(["0", "1", "2", "33"]), "");
  assert.strictEqual(M.get_lcp(["11", "11", "113", "113", "11345", "1134"]), "11");
})();