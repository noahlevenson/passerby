#!/usr/bin/env bash

# Travis executes this file from the passerby root directory, not /build!

git clone https://github.com/jedisct1/libsodium.js
# export NODE_PATH=/home/travis/build/noahlevenson/passerby/libsodium.js/dist/modules/
# ^^^ This is configured in Travis settings
cp ./build/passerby.json /home/travis/build/noahlevenson/passerby/