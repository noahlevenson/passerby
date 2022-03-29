#!/usr/bin/env bash

node $GITHUB_WORKSPACE/test/core/math.spec.js
node $GITHUB_WORKSPACE/test/core/uint8.spec.js
node $GITHUB_WORKSPACE/test/core/types/bigboy.spec.js
node $GITHUB_WORKSPACE/test/core/types/bintree.spec.js