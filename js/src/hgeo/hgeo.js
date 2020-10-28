/** 
* HGEO
* HGEO provides services for describing
* and transforming geographic data based
* on latitude and longitude
*
*
*/ 

"use strict";

const { Hgeo_rect } = require("./hgeo_rect.js");

class Hgeo {
	static LAT_MINUTES_MILES = 1.15;
	static LONG_MINUTES_MILES = 0.91;
	static MINUTES_PER_DEGREE = 60;
	static SEARCH_DIST_MILES = 0.5; // Search bounding box dimensions are SEARCH_DISTANCE * 2 x SEARCH_DISTANCE * 2
	
	constructor() {

	}

	// Get the coord pairs for a square window with extremeties 'd' miles equidistant from center point 'pair' 
	static get_exts(pair, d) {
		// formula is CENTER_POINT +/- (DISTANCE_IN_MILES / NUMBER_OF_MINUTES_PER_MILE / NUMBER_OF_MINUTES_PER_DEGREE)

		const long_offset = Hgeo.SEARCH_DIST_MILES / Hgeo.LONG_MINUTES_MILES / Hgeo.MINUTES_PER_DEGREE;
		const lat_offset = Hgeo.SEARCH_DIST_MILES / Hgeo.LAT_MINUTES_MILES / Hgeo.MINUTES_PER_DEGREE;

		const left = pair.long - long_offset; 
		const right = pair.long + long_offset;
		const bottom = pair.lat - lat_offset;
		const top = pair.lat + lat_offset;

		return new Hgeo_rect({left: left, right: right, top: top, bottom: bottom});
	}
}

module.exports.Hgeo = Hgeo;