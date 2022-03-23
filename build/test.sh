#!/usr/bin/env bash

# Execute this file from the passerby root directory, not /build!

node ./test/core/math.spec.js
node ./test/core/uint8.spec.js
node ./test/core/types/bigboy.spec.js
node ./test/core/types/bintree.spec.js