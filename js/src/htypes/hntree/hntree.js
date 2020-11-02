/** 
* HNTREE
* Class for an n-ary tree
*
* 
*
*
*/ 

"use strict";

const { Hntree_node } = require("./hntree_node.js");

class Hntree {
	static LABELS = {
		BLACK: 0,
		WHITE: 1
	};

	root;

	constructor(root = null) {
		this.root = root;
	}

	get_root() {
		return this.root;
	}

	// TODO: write me -- this should return node number 'n' as enumerated by DFS preorder traversal
	get_node(n) {

	}

	// Depth first search, returns array data, you can put whatever you want in there
	// Calls visitation callback pre(node, data) where you'd want it for a preorder traversal, calls post(node, data) postorder
	dfs(pre = () => {}, post = () => {}, node = this.get_root(), data = []) {
		pre(node, data)

		node.get_all_children().forEach((child) => {
			data = this.dfs(pre, post, child, data);
		});

		post(node, data);
		return data;
	}

	// Breadth first search, visitation callback visit(node, distance_from_root)
	bfs(visit = () => {}, node = this.get_root(), data = []) {
		// Get the nodes in a list so we can refer to them by index number
		const node_list = this.dfs((node, data) => {
			data.push(node);
		});

		// Create a parallel list of labels
		const label_list = [];

		for (let i = 0; i < node_list.length; i += 1) {
			label_list.push({label: Hntree.LABELS.WHITE, d: Number.POSITITIVE_INFINITY});
		}

		const q = [];
		label_list[node_list.indexOf(node)] = {label: Hntree.LABELS.BLACK, d: 0};
		q.push(node);

		while (q.length > 0) {
			const v = q.pop();
			visit(v, label_list[node_list.indexOf(v)].d);
			
			v.get_all_children().forEach((w) => {
				if (label_list[node_list.indexOf(w)].label === Hntree.LABELS.WHITE) {
					label_list[node_list.indexOf(w)] = {label: Hntree.LABELS.BLACK, d: label_list[node_list.indexOf(v)].d + 1};
					q.push(w);
				}
			});
		}
	}

	// Serialize as a simple "plain value" JSON object without circular references, etc.
	// Includes each node's number 'n' as enumerated by DFS preorder traversal
	toJSON() {
		const obj_map = new Map();
		let n = 0;

		this.dfs((node, data) => {
			obj_map.set(node, {data: node.data, children: [], n: n});
			n += 1;
		});

		this.dfs((node, data) => {
			if (node.parent) {
				const p = obj_map.get(node.parent);
				p.children.push(obj_map.get(node));
			}
		});

		return obj_map.get(this.get_root());
	}
}

module.exports.Hntree = Hntree;