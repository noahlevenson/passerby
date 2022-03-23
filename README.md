# passerby

[![Build Status](https://app.travis-ci.com/noahlevenson/passerby.svg?branch=master)](https://app.travis-ci.com/noahlevenson/passerby)

# :compass: Table of contents
* [What is Passerby?](#earth_americas-what-is-passerby)
* [Portability as a design requirement](#handbag-portability-as-a-design-requirement)
* [Technology overview](#floppy_disk-technology-overview)

### :earth_americas: What is Passerby?
[Passerby](https://passerby.at) is a peer-to-peer protocol for geographic resource discovery. It helps you find out who and what is near any point on Earth &mdash; no coordinating central authority required.

It's byzantine fault tolerant, it supports a full node on mobile devices, and it works well offline.

You can use it to build decentralized hyperlocal applications &mdash; like food delivery, ride hailing, or online dating. More broadly, though, 
our goal is to create the location layer for the decentralized web &mdash; that is, a persistent, decentralized, and scalable mechanism for coordinating with peers who are near you IRL.

### :handbag: Portability as a design requirement
This implementation is written in portable JavaScript with zero dependencies. We've used it to build projects for Node.js, the web, and React Native.

### :floppy_disk: Technology overview
Our research topics include distributed data structures, space filling curves, and applied cryptography. If that sounds interesting to you, consider [becoming a contributor](mailto:noahlevenson@gmail.com?subject=I%20want%20to%20contribute).

Thorough documentation is forthcoming. Until then, here's a guide to our source layout:

|Module |Description                                                                                                                                                   |
|-------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
|[consensus](https://github.com/noahlevenson/passerby/tree/master/src/consensus)      |byzantine consensus                                                             |
|[core](https://github.com/noahlevenson/passerby/tree/master/src/core)                |math, crypto, logging, cross platform compatibility, elementary data structures |
|[dht](https://github.com/noahlevenson/passerby/tree/master/src/dht)                  |distributed hash table                                                          |
|[pht](https://github.com/noahlevenson/passerby/tree/master/src/pht)                  |distributed trie                                                                |
|[protocol](https://github.com/noahlevenson/passerby/tree/master/src/protocol)        |protocol logic                                                                  |
|[psm](https://github.com/noahlevenson/passerby/tree/master/src/psm)                  |passerby state machine                                                          |
|[repman](https://github.com/noahlevenson/passerby/tree/master/src/repman)            |dynamic replica management                                                      |
|[transport](https://github.com/noahlevenson/passerby/tree/master/src/transport)      |transport layer abstraction (reliable UDP or local network simulation)          |
|[whoami](https://github.com/noahlevenson/passerby/tree/master/src/whoami)            |STUN-based NAT traversal and self-identification                                |                                                                              |