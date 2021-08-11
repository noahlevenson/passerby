/** 
* FKAD_KBUCKET
* A Kademlia k-bucket
*
*
*
*
*/ 

"use strict";

const { Fkad_kbucket_rec } = require("./fkad_kbucket_rec.js"); 

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

  // Get an Fkad_kbucket_rec from this k-bucket by index
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

  // Enqueue an Fkad_kbucket_rec, evicting the least recently seen
  enqueue(kbucket_rec) {
    // TODO: for sanity during development
    if (!(kbucket_rec instanceof Fkad_kbucket_rec)) {
      throw new Error("kbucket_rec must be instance of Fkad_kbucket_rec");
    }

    // For safety, since all the kbucket records in a kbucket must describe unique contacts
    if (this.exists(kbucket_rec.node_info)) {
      return;
    }

    this.data.push(kbucket_rec);

    if (this.data.length > this.max_size) {
      this.data.shift();
    }
  }

  // Check whether an Fkad_kbucket_rec for a given Fkad_node_info exists in this k-bucket
  // Return a reference to the existing Fkad_kbucket_rec || null 
  exists(node_info) {
    for (let i = 0; i < this.data.length; i += 1) {
      const c = this.data[i];

      if (c.node_info.node_id.equals(node_info.node_id) && c.node_info.addr === node_info.addr && 
        c.node_info.port === node_info.port) {
        return c;
      }
    }

    return null;
  }

  // Delete an Fkad_kbucket_rec from this k-bucket
  // kbucket_rec must be a reference to an Fkad_kbucket_rec that exists in this k-bucket
  delete(kbucket_rec) {
    this.data.splice(this.data.indexOf(kbucket_rec), 1);
  }

  // Return a shallow copy of this k-bucket's underlying linked list
  to_array() {
    return [...this.data];
  }
}

module.exports.Fkad_kbucket = Fkad_kbucket;