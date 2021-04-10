/** 
* FBINTREE
* Generalized binary tree, with operations
* to support BSTs and Merkle trees
* 
*
*
*/ 

"use strict";

const { Fbintree_node } = require("./fbintree_node.js");
const { Futil } = require("../../futil/futil.js");

class Fbintree {
	root;

	constructor(root = null) {
		this.root = root;
	}

	// Factory function to build a Merkle tree from an array of data as strings
	static build_merkle(data) {
		const q = data.map(d => new Fbintree_node({data: Futil._sha256(d)})); // Leaf nodes

		while (q.length > 0) {
			const node = q.shift();
			let sibling = node;
			node.set_parent(new Fbintree_node());
			
			// TODO: can Merkles be non-perfect? if false here, present node will only have a left child
			if (q.length > 0) {
				sibling = q.shift();
				sibling.set_parent(node.parent);
				node.parent.set_right(sibling); 
			}

			node.get_parent().set_data(Futil._sha256(`${node.data}${sibling.data}`));
			node.get_parent().set_left(node);
	
			if (q.length > 0) {
				q.push(node.parent);
			} else {
				return new this(node.parent);
			}
		}
	}

	get_root() {
		return this.root;
	}

	// Depth first search -- returns an array of which the contents
	// are determined by the callback function cb, which is 
	// executed for every node in the tree
	// Assumes that the tree has at least 1 node
	dfs(cb, node = this.get_root(), data = []) {
		if (node.get_left() !== null) {
			data = this.dfs(cb, node.get_left(), data);
		}

		if (node.get_right() !== null) {
			data = this.dfs(cb, node.get_right(), data);
		}

		return cb(node, data);
	}

	// Inorder traversal -- returns an array of which the contents
	// are determined by the callback function cb, which is
	// executed for every node in the tree
	// Assumes that the tree has at least 1 node
	inorder(cb, node = this.get_root(), data = []) {
		if (node !== null) {
			data = this.inorder(cb, node.get_left(), data); 
			data = cb(node, data);
			data = this.inorder(cb, node.get_right(), data);
		}

		return data;
	}

	// Get the number of nodes in this tree
	size() {
		if (this.get_root() === null) {
			return 0;
		}

		let nodes = 0;

		this.dfs((node, data) => {
			nodes += 1;
		});

		return nodes;
	}

	// Search a BST for key k using comparator function f(k, node)
	// Comparator function must return:
	// < 0 if k < node.k
	// > 0 if k > node.k
	// 0 if k === node.k
	// Assumes you're maintaining a correct BST of unique values
	bst_search(f, k, node = this.get_root()) {
		if (node === null || f(k, node) === 0) {
			return node;
		}

		if (f(k, node) < 0) {
			return this.bst_search(f, k, node.get_left());
		} else {
			return this.bst_search(f, k, node.get_right());
		}
	}

	// Insert a node into a binary search tree using comparator function f(node, oldnode)
	// Comparator function must return:
	// < 0 if node.data < oldnode.data
	// > 0 if node.data > oldnode.data
	// 0 if node.data === oldnode.data
	// Assumes you're maintaining a correct BST of unique values
	bst_insert(node, f) {
		let y = null;
		let x = this.get_root();

		while (x !== null) {
			y = x;

			if (f(node, x) < 0) {
				x = x.get_left();
			} else if (f(node, x) > 0) {
				x = x.get_right();
			} else {
				// The tree already holds this value, overwrite
				x.set_data(node.get_data());
				x = null;
			}

		}

		node.set_parent(y);

		if (y === null) {
			this.root = node;
		} else if (f(node, y) < 0) {
			y.set_left(node);
		} else if (f(node, y) > 0){
			y.set_right(node);
		}
	}

	_bst_transplant(u, v) {
		if (u.get_parent() === null) {
			this.root = v;
		} else if (u === u.get_parent().get_left()) {
			u.get_parent().set_left(v);
		} else {
			u.get_parent().set_right(v);
		}

		if (v !== null) {
			v.set_parent(u.get_parent());
		}
	}

	// Delete a node from a binary search tree
	bst_delete(node) {
		if (node.get_left() === null) {
			this._bst_transplant(node, node.get_right());
		} else if (node.get_right() === null) {
			this._bst_transplant(node, node.get_left());
		} else {
			const y = this.bst_min(node.get_right());

			if (y.get_parent() !== node) {
				this._bst_transplant(y, y.get_right());
				y.set_right(node.get_right());
				y.get_right().set_parent(y);
			}

			this._bst_transplant(node, y);
			y.set_left(node.get_left());
			y.get_left().set_parent(y);
		}
	}

	// Get minimum value in a binary search tree
	// Assumes you're maintaining a correct BST
	// Returns the node containing the minimum value
	bst_min(node = this.get_root()) {
		if (node === null) {
			return null;
		}

		while (node.get_left() !== null) {
			node = node.get_left();
		}

		return node;
	}

	// Get maximum value in a binary search tree
	// Assumes you're maintaining a correct BST
	// Returns the node containing the maximum value
	bst_max(node = this.get_root()) {
		if (node === null) {
			return null
		}
		
		while (node.get_right() !== null) {
			node = node.get_right();
		}

		return node;
	}

	// Get the successor to a given node in a binary search tree
	// Assumes you're maintaining a correct BST
	// Returns the successor node
	bst_successor(node) {
		if (node.get_right() !== null) {
			return this.bst_min(node.get_right());
		}

		let p = node.get_parent();

		while (p !== null && node === p.get_right()) {
			node = p;
			p = p.get_parent();
		}

		return p;
	}
}

module.exports.Fbintree = Fbintree;