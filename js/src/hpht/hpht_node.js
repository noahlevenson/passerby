// Class for a PHT node
class Hpht_node {
	created;
	label;
	children;
	ptr_left;
	ptr_right;
	data;

	constructor({label = null, root = false} = {}) {
		// TODO: validation
		if (typeof label !== "bigint" && root === false) {
			throw new TypeError("Argument 'label' must be BigInt unless root === true");
		}

		this.children = {
			0x00: null,
			0x01: null
		};

		this.ptr_left = null;
		this.ptr_right = null;
		this.data = new Map();
		this.label = label;
		this.created = new Date();
	}

	is_leaf() {
		return (this.children[0x00] === null && this.children[0x01] === null); // TODO: We only must check one because a node can't have only one child
	}

	size() {
		return this.data.size;
	}

	put(key, val) {
		if (typeof key !== "bigint") {
			throw new TypeError("Argument 'key' must be BigInt");
		}

		this.data.set(key.toString(16), val);
	}

	get(key) {
		if (typeof key !== "bigint") {
			throw new TypeError("Argument 'key' must be BigInt");
		}

		return this.data.get(key.toString(16));
	}
}

module.exports.Hpht_node = Hpht_node;