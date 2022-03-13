"use strict";

class Entry {
  constructor() {
    this.request = null;
    this.pre_prepare = [];
    this.prepare = [];
    this.commit = [];
    this.committed_local = false;
  }
}

module.exports = { Entry };