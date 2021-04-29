/** 
* FKAD_KBUCKET
* A Kademlia k-bucket
*
*
*
*
*/ 

"use strict";

class Fkad_kbucket {
  max_size;
  data;
  prefix;
  touched;

  constructor({max_size, prefix} = {}) {
    this.max_size = max_size;
    this.prefix = prefix;
    this.data = [];
    this.touch();
  }

  // Get an Fkad_node_info from this k-bucket by index
  get(i) {
    return this.data[i];
  } 

  // Get this k-bucket's prefix
  get_prefix() {
    return this.prefix;
  }

  // Set time last touched (ms since Unix Epoch)
  touch() {
    this.touched = Date.now();
  }

  // Get time last touched
  get_touched() {
    return this.touched;
  }

  // Has this k-bucket reached max capacity?
  is_full() {
    return this.data.length >= this.max_size;
  }

  // Get current length of this k-bucket
  length() {
    return this.data.length;
  }

  // Enqueue an Fkad_node_info, evicting the least recently seen
  enqueue(node_info) {
    // For safety, since all node_infos in our k-bucket must be unique
    if (this.exists(node_info)) {
      return;
    }

    this.data.push(node_info);

    if (this.data.length > this.max_size) {
      this.data.shift();
    }
  }

  // Check whether an Fkad_node_info exists in this k-bucket
  // Return a reference to the Fkad_node_info || null 
  exists(node_info) {
    for (let i = 0; i < this.data.length; i += 1) {
      const c = this.data[i];

      if (c.node_id.equals(node_info.node_id) && c.addr === node_info.addr && 
        c.port === node_info.port) {
        return c;
      }
    }

    return null;
  }

  // Delete an Fkad_node_info from this k-bucket
  // node_info must be a reference to an Fkad_node_info that exists in this k-bucket
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

module.exports.Fkad_kbucket = Fkad_kbucket;