/** 
* FGEO_RECT
* Rectangular geographic "window" as defined by its
* bottom left (min) and top right (max) vertices
*
*
*
*/ 

"use strict";

const { Fgeo_coord } = require("./fgeo_coord.js");

class Fgeo_rect {
  min;
  max;

  constructor({left = null, top = null, right = null, bottom = null} = {}) {
    this.min = new Fgeo_coord({lat: bottom, long: left});
    this.max = new Fgeo_coord({lat: top, long: right});
  }

  get_min() {
    return this.min;
  }

  get_max() {
    return this.max;
  }
}

module.exports.Fgeo_rect = Fgeo_rect;