/** 
* FKAD_NODE_INFO
* An FKAD_NODE_INFO is the basic unit of contact info for a peer
*
*
*
*
*/ 

"use strict";

class Fkad_node_info {
	addr;
	port;
	node_id;
	pubkey;

	constructor({addr = null, port = null, node_id = null, pubkey = null} = {}) {
		this.addr = addr;
		this.port = port;
		this.node_id = node_id;
		this.pubkey = pubkey;
	}
}

module.exports.Fkad_node_info = Fkad_node_info;