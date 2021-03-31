/** 
* HGRAPH
* Graph data structure based on an adjacency list
* 
* 
*
*
*/ 

"use strict";

class Hgraph {
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

	// Idempotently an edge from vertex label v to vertex label u
	// assumes labels as strings
	add_edge(v, u) {
		this.add_vertex(v);
		const e = this.data.get(v);

		if (!e.includes(u)) {
			e.push(u);
		}
	}
}

module.exports.Hgraph = Hgraph;