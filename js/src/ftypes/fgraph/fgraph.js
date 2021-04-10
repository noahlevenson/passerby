/** 
* FGRAPH
* Graph data structure based on an adjacency list
* 
* 
*
*
*/ 

"use strict";

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
}

module.exports.Fgraph = Fgraph;