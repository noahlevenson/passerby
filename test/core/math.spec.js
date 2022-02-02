"use strict";

const assert = require("assert");
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