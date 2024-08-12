# passerby

[![Unit tests](https://github.com/noahlevenson/passerby/actions/workflows/test.yml/badge.svg)](https://github.com/noahlevenson/passerby/actions/workflows/test.yml)

![Passerby Park gif](https://github.com/noahlevenson/passerby/blob/master/passerby.gif)

# :compass: Table of contents
* [What is Passerby?](#earth_americas-what-is-passerby)
* [Research emulator](#hammer-research-emulator)
* [Quickstart](#rocket-quickstart)
* [Design goals](#pencil2-design-goals)
* [The asterisk](#heavy_exclamation_mark-the-asterisk)
* [Technology overview](#floppy_disk-technology-overview)


### :earth_americas: What is Passerby?
[Passerby](https://passerby.at) is a peer-to-peer protocol for location-aware resource discovery. Using Passerby, you can find nearby people or resources &mdash; or help people find *you* &mdash; without requiring a coordinating central authority.

It's Byzantine fault tolerant<sup>\*</sup> and it supports a full node on mobile devices.

You might use it to build decentralized hyperlocal applications &mdash; like food delivery, ride hailing, or online dating. More broadly, **our goal is to create the location layer for the decentralized web** &mdash; that is, a persistent, decentralized, and scalable mechanism for coordinating with peers based on geographic proximity.


### :hammer: Research emulator
The [gif](https://github.com/noahlevenson/passerby/blob/master/passerby.gif) above was captured in [Passerby Park](https://github.com/noahlevenson/park) &mdash; a graphical research emulator for studying the behaviors of Passerby networks.


### :rocket: Quickstart
A good first step is to operationalize Passerby in [Passerby Park](https://github.com/noahlevenson/park). This will create a local test network consisting of 10 peers and let you execute protocol functions from any peer's perspective using a browser-based GUI.

```
# Passerby depends on libsodium for cryptographic primitives
git clone https://github.com/jedisct1/libsodium.js

# Get Passerby and Passerby Park
git clone https://github.com/noahlevenson/passerby
git clone https://github.com/noahlevenson/park

# Configure Passerby
cd passerby
cp default.json passerby.json

# Edit passerby.json and supply the absolute path to libsodium-wrappers.js
# e.g. "/home/user/libsodium.js/dist/modules/libsodium-wrappers.js"

# Install Passerby Park's dependencies
cd park
npm i

# Configure Passerby Park
cd park/server
cp default.json park.json

# Edit park.json and supply the absolute path to Passerby (note the trailing slash)
# e.g. "/home/user/passerby/"

# Start Passerby Park
cd park/server/src
export NODE_PATH=/path/to/libsodium.js/dist/modules
node index.js
```

Direct your browser to `localhost:9000` to load the GUI. Click on any peer to open its command menu.

**SEARCH N**: Execute a geosearch over N square miles. The GUI will draw a search box (to scale) and highlight peers that are returned by the search function. The search box and peer highlighting are independent functions. In other words, the box represents the ground truth, and the peer highlighting represents the real result of the geosearch operation. This is how we verify the correctness of the distributed algorithms.

**MOVE**: Move this peer to a new location. Click a second time to select a location on the map.

Click the broom in the upper left corner to clear the current search results.


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
