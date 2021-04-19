# libfood

<p float="left">
	<img src="https://github.com/noahlevenson/libfood/blob/master/screens/order_detail.jpg" height="200" />
	<img src="https://github.com/noahlevenson/libfood/blob/master/screens/menu_editor.jpg" height="200" />
	<img src="https://github.com/noahlevenson/libfood/blob/master/screens/chat.jpg" height="200" />
	<img src="https://github.com/noahlevenson/libfood/blob/master/screens/trust_network.jpg" height="200" />
	<img src="https://github.com/noahlevenson/libfood/blob/master/screens/console.jpg" height="200" />
	<img src="https://github.com/noahlevenson/libfood/blob/master/screens/rest_list.png" height="200">
	<!-- <img src="https://github.com/noahlevenson/libfood/blob/master/screens/add_item.jpg" height="200" /> -->
	<img src="https://github.com/noahlevenson/libfood/blob/master/screens/checkout.png" height="200" />
</p>

libfood is the reference implementation of [Free Food](https://freefood.is), a decentralized location-aware p2p protocol to make food delivery fair again (and make Grubhub obsolete).

For software clients which operationalize libfood for end users, see Free Food Battlestation and Free Food Hotline.

**libfood is pre-alpha and in active development. There will be bugs, security issues, missing features, etc.**

Free Food was developed at [Consumer Reports Digital Lab](https://digital-lab.consumerreports.org/) by "Hacker in Residence" (and co-owner of [Pizzeria La Rosa](https://www.youtube.com/watch?v=9bz1Ko5ZDzQ&t=266s) in New Rochelle, NY) [Noah Levenson](https://noahlevenson.com).

### :handbag: Portability as a design requirement
Restaurant owners are accustomed to using marketplace order management apps, such as those provided by Grubhub and DoorDash, on mobile devices. But hungry people shouldn't be expected to download a mobile app to order food. Thus, a mandatory objective of this implementation is to ensure portability across a variety of JS runtimes.

|JS Runtime  |Compatible?|Dependencies|Notes                                                    |
|------------|-----------|------------|---------------------------------------------------------|
|Node.js     |yes        |none        |                                                         |
|browsers    |soon       |none        |                                                         |
|React Native|yes        |~3 shims    |Android only; native Java optimzations, see fnative      |

### :monocle_face: Implementation overview
libfood is a layered API:

|Module |Description                                                                    |
|---------------------------------------------------------------------------------------|
|fkad   |distributed hash table                                                         |
|fpht   |prefix hash tree                                                               |
|fgeo   |math for transforming and interpreting geographic data                         |
|fid    |identity creation, authentication, and reputation                              |
|fdlt   |generalized distributed ledger for managing arbitrary contracts                |
|fksrv  |distributed public keyserver                                                   |
|fstun  |STUN implementation                                                            |
|flog   |logging                                                                        |
|fcrypto|cryptography                                                                   |
|ftypes |elementary data structures                                                     |
|futil  |utility functions                                                              |
|fbuy   |e-commerce layer: menus, transactions, payments, etc.                          |
|ftrans |transport layer with hybrid encryption                                         |
|fnative|native platform optimizations                                                  |
|fapp   |public API                                                                     |

### :floppy_disk: Technology overview
Location-aware peer discovery is accomplished primarily through the use of a [Morton-order curve](https://en.wikipedia.org/wiki/Z-order_curve) and a [prefix hash tree](https://people.eecs.berkeley.edu/~sylvia/papers/pht.pdf), a distributed data structure which enables efficient range queries over a distributed hash table.

The network is secured using several mechanisms: Resource providers participate in a distributed system of peer-signed certificates -- i.e., a "[web of trust](https://en.wikipedia.org/wiki/Web_of_trust)." A restaurant's trustworthiness is based on the number of signatures it has received from other restaurants and other features of the trust graph topology. This system exploits the simple observation that restaurant owners tend to know and cooperate with other local restaurant owners.

Free Food has a distributed keyserver built atop a distributed ledger; the protocol includes a generalized distributed ledger with a stack-based virtual machine for executing arbitrary contracts, based largely on the design of the [Bitcoin blockchain](https://bitcoin.org/bitcoin.pdf).

Identity creation for resource providers is made costly with a computational proof-of-work mechanism based on the [partial preimage discovery first employed by Hashcash](https://en.wikipedia.org/wiki/Hashcash). Taking inspiration from systems used to verify real world identities on messageboards like Reddit -- as well as the anti-catfishing systems employed by Tinder and Bumble -- Free Food requires resource providers to supply a photographic proof of identity which includes a unique symbol which is mathematically bound to the proof-of-work associated with their public key.

Free Food implements [STUN](https://tools.ietf.org/html/rfc5389) for NAT traversal.

At identity creation time, Free Food uses OpenStreetMap's [Nominatim](https://github.com/osm-search/Nominatim) open source geocoder to convert street address to latitude and longitude. OpenStreetMap data is © OpenStreetMap contributors, available under the [Open Database License](https://www.openstreetmap.org/copyright).

### :question: Why Free Food
Third party food delivery apps like DoorDash and Grubhub are parasitic middlemen which are [destroying small businesses and raising prices for everyone](https://chicago.eater.com/2021/1/26/22250664/delivery-apps-destroying-restaurants-chicago-uber-eats-doordash-postmates). They're also [deeply unprofitable](https://www.bloomberg.com/opinion/articles/2019-10-31/food-delivery-is-a-dead-end-for-grubhub-doordash-and-postmates) companies which are entirely the product of Silicon Valley speculation.

Consequently, as the Wall Street Journal and others have reported, [some of these platforms are planning to stop providing delivery logistics](https://www.wsj.com/articles/strategy-behind-blockbuster-grubhub-deal-dont-deliver-11593266407) -- focusing instead on providing nothing more to consumers than an aggregated ordering interface. For this "service," which is merely to broker local restaurant orders, middlemen like Grubhub charge restaurants 30% per transaction. This far exceeds the profit margins of a typical restaurant.

The goal of Free Food is to provide this function as a protocol rather than a platform, eliminating the middleman by enabling the world's restaurants to effortlessly self-organize as a decentralized marketplace. 

In other words: **Free Food lets you search for nearby restaurants, view their menus, and place an order with one click -- but without paying fees to a parasitic third party delivery platform.**

### :brain: Active research
1. An improved trust metric based on a deep learning approach to network community detection

2. Star rating reputation system built atop the distributed ledger

3. Scalability to ~300k total restaurant peers and ~20M total diner peers

4. Fully decentralize the distributed ledger - currently proof of authority, switch to proof of stake/proof of reputation/proof of work

5. Decentralized delivery logistics 
