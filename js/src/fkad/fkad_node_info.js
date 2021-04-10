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

	constructor({addr = null, port = null, node_id = null} = {}) {
		this.addr = addr;
		this.port = port;
		this.node_id = node_id;
	}

	// TODO: add getters?
}

module.exports.Fkad_node_info = Fkad_node_info;