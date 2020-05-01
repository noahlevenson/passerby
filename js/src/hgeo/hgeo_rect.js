const { Hgeo_coord } = require("./hgeo_coord.js");

// Class for an hgeo rectangle, which is defined by its bottom left (min) vertex and its top right (max) vertex
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