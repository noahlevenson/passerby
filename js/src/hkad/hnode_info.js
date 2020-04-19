// Class for a hoodnet node info object
class Hnode_info {
	constructor({addr = null, port = null, node_id = null} = {}) {
		this.addr = addr;
		this.port = port;
		this.node_id = node_id;
	}
}

module.exports.Hnode_info = Hnode_info;