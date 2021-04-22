/** 
* FGRAPH
* Graph data structure based on an adjacency list
* 
* 
*
*
*/ 

"use strict";

const { Fgraph_vprop } = require("./fgraph_vprop.js");

class Fgraph {
	data;

	constructor() {
		this.data = new Map();
	}

	// Idempotently add a vertex with label v
	// assumes v as string
	add_vertex(v) {
		if (!this.data.has(v)) {
			this.data.set(v, []);
		}
	}

	// Idempotently add an edge from vertex label v to vertex label u
	// assumes labels as strings
	add_edge(v, u) {
		this.add_vertex(v);
		this.add_vertex(u);
		const e = this.data.get(v);

		if (!e.includes(u)) {
			e.push(u);
		}
	}

	// Idempotently remove an edge from vertex label v to vertex label u
	// assumes labels as strings
	del_edge(v, u) {
		const e = this.data.get(v);

		if (e && e.includes(u)) {
			e.splice(e.indexOf(u, 1));
		}
	}

	// Depth first search, returns a depth first forest as a predecessor subgraph
	// represented as a Map of vertex properties parallel to this Fgraph
	dfs(visit_order = Array.from(this.data.keys())) {
		const vprops = new Map();
		Array.from(this.data.keys()).forEach(key => vprops.set(key, new Fgraph_vprop({color: Fgraph_vprop.COLOR.WHITE, label: key})));
		let time = 0;

		visit_order.forEach((v) => {
			if (vprops.get(v).color === Fgraph_vprop.COLOR.WHITE) {
				time = this._dfs_visit(vprops, v, time + 1);
			}
		});

		return vprops;
	}

	_dfs_visit(vprops, v, time) {
		const current_v = vprops.get(v);
		current_v.d = time;
		current_v.color = Fgraph_vprop.COLOR.BLACK;

		this.data.get(v).forEach((e) => {
			const vp = vprops.get(e);

			if (vp.color === Fgraph_vprop.COLOR.WHITE) {
				vp.pi = current_v;
				time = this._dfs_visit(vprops, e, time);
			}
		});

		current_v.f = time + 1;
		return current_v.f;
	}

	// Compute the transpose of this Fgraph and return it as a new Fgraph
	t() {
		const gt = new Fgraph();
		Array.from(this.data.entries()).forEach(pair => pair[1].forEach(e => gt.add_edge(e, pair[0])));
		return gt;
	}

	// Strongly connected components, returns a 2D array of vertex labels 
	// where each arr[i] is a strongly connected component
	scc() {
		const vprops = this.dfs();
		const gt = this.t();
		const visit_order = Array.from(vprops.values()).sort((a, b) => b.f - a.f).map(vprop => vprop.label);
		const dff = gt.dfs(visit_order);

		// Decompose the depth first forest
		const scc = [];

		Array.from(dff.values()).sort((a, b) => b.f - a.f).forEach((vprop) => {
			if (!vprop.pi) {
				scc.push([vprop.label]);
			} else {
				scc[scc.length - 1].push(vprop.label);
			}
		});

		return scc;
	}
}

module.exports.Fgraph = Fgraph;