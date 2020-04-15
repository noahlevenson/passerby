// Class for a hoodnet node info object
class Hnode_info {
	constructor({ip_addr = null, udp_port = null, node_id = null} = {}) {
		this.addr = ip_addr;
		this.port = udp_port;
		this.node_id = node_id;
	}
}

module.exports.Hnode_info = Hnode_info;