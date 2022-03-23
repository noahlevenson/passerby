#!/usr/bin/env bash

# Execute this file from the passerby root directory, not /build!

git clone https://github.com/jedisct1/libsodium.js
export NODE_PATH=./libsodium.js/dist/modules/
cp ./build/passerby.json .