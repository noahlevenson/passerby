// Class for a PHT node
class Hpht_node {
	created;
	children;
	ptr_left;
	ptr_right;
	data;

	constructor() {
		this.children = {
			0x00: null,
			0x01: null
		};

		this.ptr_left = null;
		this.ptr_right = null;
		this.data = new Map();
		this.created = new Date();
	}

	is_leaf() {
		return (this.children[0x00] === null && this.children[0x01] === null); // TODO: We only must check one because a node can't have only one child
	}
}

module.exports.Hpht_node = Hpht_node;