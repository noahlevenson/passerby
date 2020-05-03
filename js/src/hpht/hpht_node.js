// Class for a PHT node
// TODO: I feel like this class, and all classes, should really have getters and setters for everything, and we should stop accessing members directly
// But maybe we can wait to see where the JS standard for private members lands -- is it going to be adopted? It's what I want to use
class Hpht_node {
	static MAGIC_VAL = `${Buffer.from([0x19, 0x81]).toString()}v3ryrar3`;
	
	created;
	label;
	children;
	ptrs;
	data;
	magic;

	constructor({label = null} = {}) {
		// TODO: validation
		if (typeof label !== "string") {
			throw new TypeError("Argument 'label' must be string");
		}

		this.children = {
			0x00: null,
			0x01: null
		};

		this.ptrs = {
			"left": null,
			"right": null
		};	

		this.data = new Map();
		this.label = label;
		this.created = new Date();
		this.magic = Hpht_node.MAGIC_VAL.slice(0);
	}	

	// TODO: Make this more reliable - currently we just implement some dumb magic buffer but there should be some thought put into this
	// this object identification is a big part of security as well!!!
	static valid_magic(obj) {
		try {
			return obj.magic === Hpht_node.MAGIC_VAL ? true : false;
		} catch(err) {
			return false;
		}
	}
	
	// For some reason I wrote a setter for the pointers, we need to do this for children too
	set_ptrs({left = null, right = null} = {}) {
		if (typeof left !== "string" && left !== null) {
			throw new TypeError("Argument 'left' must be string or null");
		}

		if (typeof right !== "string" && right !== null) {
			throw new TypeError("Argument 'left' must be string or null");
		}

		this.ptrs.left = left;
		this.ptrs.right = right;
	}

	ptr_left() {
		return this.ptrs.left;
	}

	ptr_right() {
		return this.ptrs.right;
	}

	get_label() {
		return this.label;
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

		return this.data.set(key.toString(16), val);
	}

	get(key) {
		if (typeof key !== "bigint") {
			throw new TypeError("Argument 'key' must be BigInt");
		}

		return this.data.get(key.toString(16));
	}

	delete(key) {
		return this.data.delete(key.toString(16));
	}

	get_all_pairs() {
		return Array.from(this.data.entries());
	}
}

module.exports.Hpht_node = Hpht_node;