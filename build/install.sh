#!/usr/bin/env bash

git clone https://github.com/jedisct1/libsodium.js
export NODE_PATH=./libsodium.js/dist/modules/
cp passerby.json ..