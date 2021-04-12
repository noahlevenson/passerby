# libfood

<p float="left">
	<img style="margin-left: 20px;" src="https://github.com/noahlevenson/libfood/blob/master/screens/order_detail.jpg" height="200" />
	<img style="margin-left: 20px;" src="https://github.com/noahlevenson/libfood/blob/master/screens/menu_editor.jpg" height="200" />
	<img style="margin-left: 20px;" src="https://github.com/noahlevenson/libfood/blob/master/screens/chat.jpg" height="200" />
	<img style="margin-left: 20px;" src="https://github.com/noahlevenson/libfood/blob/master/screens/trust_network.jpg" height="200" />
	<img style="margin-left: 20px;" src="https://github.com/noahlevenson/libfood/blob/master/screens/console.jpg" height="200" />
	<img style="margin-left: 20px;" src="https://github.com/noahlevenson/libfood/blob/master/screens/rest_list.png" height="200">
	<!-- <img style="margin-left: 20px;" src="https://github.com/noahlevenson/libfood/blob/master/screens/add_item.jpg" height="200" /> -->
	<img style="margin-left: 20px;" src="https://github.com/noahlevenson/libfood/blob/master/screens/checkout.png" height="200" />
</p>
libfood is the reference implementation of [Free Food](https://freefood.is), a decentralized location-aware p2p protocol to make food delivery fair again (and make Grubhub obsolete).

**libfood is in active development. There will be bugs, security issues, missing features, etc.**

### :brain: Features
Portable across JS runtimes: Node.js, browsers, React Native (Android only)

Zero dependencies under Node.js and the browser, ~3 shims required under React Native


Native crypto under React Native

### :question: Why libfood
As the Wall Street Journal and others have reported, [the largest centralized food delivery platforms in the world are planning to stop providing delivery services](https://www.wsj.com/articles/strategy-behind-blockbuster-grubhub-deal-dont-deliver-11593266407) -- focusing instead on providing nothing more to consumers than an aggregated ordering interface. For this "service," which is to merely relay each customer's order to the restaurant which must fulfill it, corporations like Grubhub charge restaurants 30% per order. This far exceeds the profit margins of a typical restaurant.

The goal of Free Food is to provide this function as a protocol rather than a platform, eliminating the middleman by enabling the world's restaurants to effortlessly self-organize as a decentralized marketplace. In other words: **Free Food lets you search for nearby restaurants, view their menus, and place an order with one click -- but without paying fees to a parasitic third party delivery platform.**

### :floppy_disk: Technology overview
Location-aware peer discovery is accomplished primarily through the use of a [Morton-order curve](https://en.wikipedia.org/wiki/Z-order_curve) and a [prefix hash tree](https://people.eecs.berkeley.edu/~sylvia/papers/pht.pdf), a distributed data structure which enables efficient range queries of a distributed hash table.

The network is secured using several mechanisms: Resource providers participate in a distributed system of peer-signed certificates -- i.e., a "[web of trust](https://en.wikipedia.org/wiki/Web_of_trust)." A restaurant's trustworthiness is based on the number of signatures it has received from other restaurants and other features of the trust graph topology. This system exploits the simple observation that restaurant owners tend to know and cooperate with other local restaurant owners.

Free Food has a distributed keyserver built atop a distributed ledger; the protocol includes a generalized distributed ledger with a stack-based virtual machine for executing arbitrary contracts, based largely on the design of the [Bitcoin blockchain](https://bitcoin.org/bitcoin.pdf).

Identity creation for resource providers is made costly with a computational proof-of-work mechanism based on the [partial preimage discovery first employed by Hashcash](https://en.wikipedia.org/wiki/Hashcash). Taking inspiration from systems used to verify real world identities on messageboards like Reddit -- as well as the anti-catfishing systems employed by Tinder and Bumble -- Free Food requires resource providers to supply a photographic proof of identity which includes a unique symbol which is mathematically bound to the proof-of-work associated with their public key.

Free Food implements [STUN](https://tools.ietf.org/html/rfc5389) for NAT traversal.
