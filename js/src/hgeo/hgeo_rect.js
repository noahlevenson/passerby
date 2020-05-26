/** 
* HGEO_RECT
* Rectangular geographic "window" as defined by its bottom left (min) and top right (max) vertices
*
*
*
*
*/ 

"use strict";

const { Hgeo_coord } = require("./hgeo_coord.js");

class Hgeo_rect {
	min;
	max;

	constructor({left = null, top = null, right = null, bottom = null} = {}) {
		this.min = new Hgeo_coord({lat: bottom, long: left});
		this.max = new Hgeo_coord({lat: top, long: right});
	}

	get_min() {
		return this.min;
	}

	get_max() {
		return this.max;
	}
}

module.exports.Hgeo_rect = Hgeo_rect;