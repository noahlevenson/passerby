# passerby

![Unit tests](https://github.com/noahlevenson/passerby/workflows/Unit%20tests/badge.svg)

![Passerby Park gif](https://github.com/noahlevenson/passerby/blob/master/passerby.gif)

# :compass: Table of contents
* [What is Passerby?](#earth_americas-what-is-passerby)
* [Design goals](#pencil2-design-goals)
* [The asterisk](#heavy_exclamation_mark-the-asterisk)
* [Technology overview](#floppy_disk-technology-overview)


### :earth_americas: What is Passerby?
[Passerby](https://passerby.at) is a peer-to-peer protocol for location-aware resource discovery. Using Passerby, you can find nearby people or resources &mdash; or help people find *you* &mdash; without requiring a coordinating central authority.

It's Byzantine fault tolerant<sup>\*</sup> and it supports a full node on mobile devices.

You might use it to build decentralized hyperlocal applications &mdash; like food delivery, ride hailing, or online dating. More broadly, though, **our goal is to create the location layer for the decentralized web** &mdash; that is, a persistent, decentralized, and scalable mechanism for coordinating with peers based on geographic proximity.


### :pencil2: Design goals
#### **Low latency, high frequency updates**

Passerby should support decentralized applications in which peer locations change rapidly, like ride hailing.


#### **Mutual offline discovery**

If Bob discovers Alice while Alice is experiencing a temporary loss of connectivity, Alice must hear about it when she reconnects &mdash; even if at that point, Bob is far away.


#### **Radical portability and zero dependencies** 

This reference implementation is designed to work in a variety of disparate JavaScript runtimes, including Node.js and Hermes (React Native). Passerby relies only on [libsodium](https://doc.libsodium.org/) for cryptographic primitives.


### :heavy_exclamation_mark: The asterisk
Passerby is currently in development. It is not production-grade software. Security vulnerabilities are likely to exist, both at the level of protocol design and concrete implementation. 


### :floppy_disk: Technology overview
Our research topics include distributed data structures, space filling curves, and applied cryptography. If that sounds interesting to you, consider [becoming a contributor](mailto:noahlevenson@gmail.com?subject=I%20want%20to%20contribute).

Thorough documentation is forthcoming. Until then, here's a guide to our source layout:

|Module |Description                                                                                                                                                   |
|-------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
|[consensus](https://github.com/noahlevenson/passerby/tree/master/src/consensus)      |Byzantine consensus                                                             |
|[core](https://github.com/noahlevenson/passerby/tree/master/src/core)                |math, crypto, logging, cross platform compatibility, elementary data structures |
|[dht](https://github.com/noahlevenson/passerby/tree/master/src/dht)                  |distributed hash table                                                          |
|[pht](https://github.com/noahlevenson/passerby/tree/master/src/pht)                  |distributed trie                                                                |
|[protocol](https://github.com/noahlevenson/passerby/tree/master/src/protocol)        |protocol logic                                                                  |
|[psm](https://github.com/noahlevenson/passerby/tree/master/src/psm)                  |passerby state machine                                                          |
|[repman](https://github.com/noahlevenson/passerby/tree/master/src/repman)            |dynamic replica management                                                      |
|[transport](https://github.com/noahlevenson/passerby/tree/master/src/transport)      |transport layer abstraction (reliable UDP or local network simulation)          |
|[whoami](https://github.com/noahlevenson/passerby/tree/master/src/whoami)            |STUN-based NAT traversal and self-identification                                |                                                                              |