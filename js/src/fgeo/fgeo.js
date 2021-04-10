/** 
* FGEO
* FGEO provides services for describing
* and transforming geographic data based
* on latitude and longitude
*
*
*/ 

"use strict";

const { Fgeo_rect } = require("./fgeo_rect.js");

class Fgeo {
	static LAT_MINUTES_MILES = 1.15;
	static LONG_MINUTES_MILES = 0.91;
	static MINUTES_PER_DEGREE = 60;
	
	constructor() {

	}

	// Get the coord pairs for a square window with extremeties 'd' miles equidistant from center point 'pair' 
	static get_exts(pair, d) {
		// formula is CENTER_POINT +/- (DISTANCE_IN_MILES / NUMBER_OF_MINUTES_PER_MILE / NUMBER_OF_MINUTES_PER_DEGREE)

		const long_offset = d / Fgeo.LONG_MINUTES_MILES / Fgeo.MINUTES_PER_DEGREE;
		const lat_offset = d / Fgeo.LAT_MINUTES_MILES / Fgeo.MINUTES_PER_DEGREE;

		const left = pair.long - long_offset; 
		const right = pair.long + long_offset;
		const bottom = pair.lat - lat_offset;
		const top = pair.lat + lat_offset;

		return new Fgeo_rect({left: left, right: right, top: top, bottom: bottom});
	}
}

module.exports.Fgeo = Fgeo;