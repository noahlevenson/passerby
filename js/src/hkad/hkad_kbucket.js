/** 
* HKAD_KBUCKET
* Abstracts a Kademlia k-bucket 
*
*
*
*
*/ 

"use strict";

class Hkad_kbucket {
	max_size;
	data;

	constructor({max_size} = {}) {
		this.max_size = max_size;
		this.data = [];
	}

	// Get an Hkad_node_info from this k-bucket by index
	get(i) {
		return this.data[i];
	}

	// Has this k-bucket reached max capacity?
	is_full() {
		return this.data.length >= this.max_size;
	}

	// Get current length of this k-bucket
	length() {
		return this.data.length;
	}

	// Enqueue an Hkad_node_info, evicting the least recently seen
	enqueue(node_info) {
		// For safety, since all node_infos in our k-bucket must be unique
		if (this.exists(node_info.node_id)) {
			return;
		}

		this.data.push(node_info);

		if (this.data.length > this.max_size) {
			this.data.shift();
		}
	}

	// Check whether an Hkad_node_info with a given node ID exists in this k-bucket
	// Return a reference to the Hkad_node_info || null 
	exists(node_id) {
		for (let i = 0; i < this.data.length; i += 1) {
			if (this.data[i].node_id.equals(node_id)) {
				return this.data[i];
			}
		}

		return null;
	}

	// Delete an Hkad_node_info from this k-bucket
	// node_info must be a reference to an Hkad_node_info that exists in this k-bucket
	delete(node_info) {
		this.data.splice(this.data.indexOf(node_info), 1);
	}

	// Return a shallow copy of this k-bucket's underlying linked list
	to_array() {
		const arr = [];

		this.data.forEach((node_info) => {
			arr.push(node_info);
		});

		return arr;
	}
}

module.exports.Hkad_kbucket = Hkad_kbucket;