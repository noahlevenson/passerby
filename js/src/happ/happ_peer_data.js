/** 
* HAPP_PEER_DATA
* A HAPP_PEER_DATA object encapsulates information
* about a HAPP peer that the peer wants to share
* with the network
*
*
*/ 

"use strict";

class Happ_peer_data {
	name;
	peer_id;

	constructor({name = null, peer_id = null} = {}) {
		this.name = name;
		this.peer_id = peer_id;
	}
}

module.exports.Happ_peer_data = Happ_peer_data;