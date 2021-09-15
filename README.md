# libfood

[![Youtube demo](https://github.com/noahlevenson/libfood/blob/master/screens/youtube_thumb.png)](https://youtu.be/vuLQelvHlkM "Youtube demo")

# :compass: Table of contents
* [What is libfood?](#hamburger-what-is-libfood)
* [What's the problem with food delivery?](#question-whats-the-problem-with-food-delivery)
* [Our research: solving decentralized location-based resource discovery](#brain-our-research-solving-decentralized-location-based-resource-discovery)
* [Portability as a design requirement](#handbag-portability-as-a-design-requirement)
* [Quickstart tutorial](#boom-quickstart-tutorial)
* [Technology overview](#floppy_disk-technology-overview)
* [Screenshots](#computer-screenshots)

### :hamburger: What is libfood?
libfood is the reference implementation of [Free Food](https://freefood.is), a decentralized location-aware p2p protocol to make food delivery free again. 

[Free Food](https://freefood.is) eliminates third party middlemen, enabling host devices to self-organize as a geosearchable peer-to-peer restaurant marketplace. Using the [Free Food](https://freefood.is) protocol, a hungry person can search for nearby restaurants, browse menus, and place an order **directly** with one click &mdash; all through one convenient interface. 

[Free Food](https://freefood.is) consists of 3 open source software packages:

* libfood (you are here)

* Free Food Battlestation, an Android software client which operationalizes libfood for restaurants

* Free Food Hotline, a desktop software client which operationalizes libfood for hungry people

To start building with libfood, see the [quickstart tutorial](#boom-quickstart-tutorial).

**libfood is a research prototype in active development. There will be bugs, security issues, missing features, etc.** [Free Food](https://freefood.is) is led by [Noah Levenson](https://noahlevenson.com), who serves as Hacker in Residence at Consumer Reports Digital Lab and also happens to co-own a [pizzeria in New Rochelle, NY](https://www.instagram.com/pizzerialarosa/).

### :question: What's the problem with food delivery?
Third party delivery apps have created convenience for consumers at the expense of small businesses. *Eater SF* [described third party platforms as "parasitic" and "ethically dubious."](https://sf.eater.com/2020/4/1/21202956/sf-east-bay-food-delivery-grubhub-doordash-parasitic-coronavirus) *Forbes* has [called for "more fair and equitable business practices"](https://www.forbes.com/sites/andrewrigie/2019/08/21/this-is-how-grubhub-is-hurting-your-favorite-restaurants-and-why-you-should-care/?sh=6f0aa482d520) from delivery apps. A recent *Washington Post* headline read: ["Restaurants are barely surviving. Delivery apps will kill them."](https://www.washingtonpost.com/outlook/2020/05/29/delivery-apps-restaurants-coronavirus/)

In short: third party delivery apps are middlemen who add significant costs which are not commensurate with the benefits provided. So why do restaurant owners freely choose to work with these platforms? That's easy: **they don't.** [Grubhub lists restaurants without permission](https://www.eater.com/21537215/restaurants-sue-third-party-delivery-service-grubhub-for-listing-businesses-without-permission); they've been sued by restaurant owners for this practice. [DoorDash was sued by In-N-Out Burger](https://www.eater.com/2015/11/11/9714840/in-n-out-doordash-delivery-lawsuit) for the same thing. [Grubhub has been caught setting up phony telephone numbers](https://www.phillymag.com/news/2019/01/04/grubhub-lawsuit-tiffin-indian-restaurant/) for local restaurants to redirect customers to their ordering portal.

You don't have to take the media's word for it, either &mdash; just ask an independent entrepreneur like [Pim Techamuanvivit](https://twitter.com/chezpim/status/1221364503507419137) or [Giuseppe Badalamenti](https://twitter.com/susie_c/status/1255971900599046144).

Maybe you're asking: "But don't third party apps provide valuable delivery services to restaurants?"

Sorry to break it to you, but oftentimes **delivery apps don't even deliver your food.** In major metropolitan markets, where most restaurants employ their own delivery personnel, the so-called "delivery" apps don't provide delivery services at all. As reported by the Wall Street Journal, [Grubhub (and their $2.5B parent company, Just Eat Takeaway) are a multinational "delivery" platform that doesn't really deliver](https://www.wsj.com/articles/strategy-behind-blockbuster-grubhub-deal-dont-deliver-11593266407). These companies have [publicly stated their intentions to stop offering optional delivery services entirely](https://www.bloomberg.com/opinion/articles/2019-10-31/food-delivery-is-a-dead-end-for-grubhub-doordash-and-postmates), considering it too low margin to ever become profitable.

So what's the point of these apps?

In metropolitan areas, their primary activity is simply to "broker" local restaurant transactions through an aggregated e-commerce portal. In other words, they make all your local restaurants **discoverable and transactable** through a single interface, and charge fees for the convenience. Uber Eats is allegedly a transportation company, so why do they charge fees for *pickup* orders through their app? Answer: because the goal of these platforms was never about delivery &mdash; it's about creating a centralized e-commerce interface which enables them to extract fees from all of our local transactions.

Here's the thing: without an aggregated digital restaurant marketplace, **finding and ordering takeout *does* remain a uniquely inconvenient experience.** It requires a patchwork of google searching, browsing Yelp, and struggling to read PDF menus on your phone. That's why the media response to the issue ("Stop using restaurant marketplaces!") and the local government response ("We'll regulate restaurant marketplaces out of existence!") are both inadequate.

We have a better solution: let's invent open technology which helps independent entrepreneurs meet their customers' expectations without centralizing power in the hands of a third party. [John Gilmore](http://www.toad.com/gnu/) famously said, "The Net interprets censorship as damage and routes around it." We think that holds true not only for censorship, but also for the inefficiencies introduced by intermediation. **We're routing around the middlemen and building a network protocol to make food delivery free again.**

### :brain: Our research: solving decentralized location-based resource discovery
Over the last 10 years, many of the most popular centralized platforms have risen to power by efficiently connecting the user to nearby resources: Tinder connects users with nearby single people. Uber connects users with nearby taxi drivers. Grubhub connects users with nearby restaurants. Separately, e-commerce marketplaces like Amazon have made our local shopping resources less competitive by providing an aggregated portal which, by virtue of its vast selection and searchability, is actually more convenient than walking down the block to visit a store.

A significantly negative consequence of this transformation is that many aspects of our daily lives are now centralized behind the paywall of a single corporate gatekeeper. Looking beyond the financial implications, this trend toward centralization also threatens freedom of expression and other civil liberties &mdash; as both resource providers and resource consumers are, even in their private transactions, increasingly subject to the policies established by large corporations.

[Free Food](https://freefood.is) is an effort to reverse this trend by providing an **open, interoperable, decentralized protocol for solving local resource problems.** Local food delivery is the first problem we're tackling. But our long term goal is to eventually power many different kinds of decentralized location-based applications &mdash; from car services, to dating and matchmaking, to aggregated local retail shopping.

### :handbag: Portability as a design requirement
Ever seen those tablet devices in a restaurant kitchen? Restaurant owners are accustomed to apps that run on mobile devices. But hungry people shouldn't be expected to download a mobile app to order food. Thus, a mandatory objective of this implementation is to ensure portability across a variety of disparate JS runtimes.

|JS Runtime  |Compatible?|Dependencies|Notes                                                    |
|------------|-----------|------------|---------------------------------------------------------|
|Node.js     |yes        |none        |                                                         |
|browsers    |soon       |none        |                                                         |
|React Native|yes        |~3 shims    |Android only; native Java optimzations, see [fnative](https://github.com/noahlevenson/libfood/tree/master/src/fnative/react_native/android)|

**libfood is written from scratch, in portable JavaScript, with zero dependencies.**

### :boom: Quickstart tutorial
Coming soon...

### :floppy_disk: Technology overview
[Free Food](https://freefood.is) presents an end-to-end solution to the decentralized restaurant marketplace problem. The protocol stack provides both low level functionality (like NAT traversal, p2p networking, distributed data storage, and geolocation-based peer discovery) and higher level abstractions (like distributed trust and reputation systems, as well as restaurant e-commerce functionality for tasks like menu editing and order status notifications).  

Our research topics include distributed data structures, [space-filling curves](https://en.wikipedia.org/wiki/Space-filling_curve), and applied cryptography. If that sounds interesting to you, consider [becoming a contributor](mailto:noah@freefood.is?subject=I want to contribute).

Thorough documentation is forthcoming. Until then, here's guide to our source layout:

|Module |Description                                                                                                                                                   |
|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
|[fkad](https://github.com/noahlevenson/libfood/tree/master/src/fkad)      |distributed hash table                                                                     |
|[fpht](https://github.com/noahlevenson/libfood/tree/master/src/fpht)      |prefix hash tree (aka distributed trie)                                                    |
|[fgeo](https://github.com/noahlevenson/libfood/tree/master/src/fgeo)      |geography module; for describing and transforming latitude/longitude data                  |
|[fid](https://github.com/noahlevenson/libfood/tree/master/src/fid)        |identity management                                                                        |
|[fdlt](https://github.com/noahlevenson/libfood/tree/master/src/fdlt)      |generalized distributed ledger with a stack-based VM                                       |
|[fksrv](https://github.com/noahlevenson/libfood/tree/master/src/fksrv)    |distributed keyserver                                                                      |
|[fstun](https://github.com/noahlevenson/libfood/tree/master/src/fstun)    |STUN implementation for NAT traversal                                                      |
|[flog](https://github.com/noahlevenson/libfood/tree/master/src/flog)      |logging                                                                                    |
|[fcrypto](https://github.com/noahlevenson/libfood/tree/master/src/fcrypto)|cryptography                                                                               |
|[ftypes](https://github.com/noahlevenson/libfood/tree/master/src/ftypes)  |elementary data structures                                                                 |
|[futil](https://github.com/noahlevenson/libfood/tree/master/src/futil)    |core math functions                                                                        |
|[fbuy](https://github.com/noahlevenson/libfood/tree/master/src/fbuy)      |e-commerce layer: menus, transactions, payments, sms, statuses, etc.                       |
|[ftrans](https://github.com/noahlevenson/libfood/tree/master/src/ftrans)  |transport layer with hybrid encryption; reliable UDP controller with bandwidth control     |
|[fnative](https://github.com/noahlevenson/libfood/tree/master/src/fnative)|native platform optimizations                                                              |
|[fapp](https://github.com/noahlevenson/libfood/tree/master/src/fapp)      |public API                                                                                 |

### :computer: Screenshots

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
