// Class for a hoodnet node info object
class Hkad_node_info {
	constructor({addr = null, port = null, node_id = null} = {}) {
		this.addr = addr;
		this.port = port;
		this.node_id = node_id;
	}
}

module.exports.Hkad_node_info = Hkad_node_info;