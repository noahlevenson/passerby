/** 
* HGEO_COORD
* Geographic latidude/longitude coordinate pair
*
*
*
*
*/ 

"use strict";

const { Hutil } = require("../hutil/hutil.js");

class Hgeo_coord {
	static LIMITS = {
		LAT_MAX: 90,
		LAT_MIN: -90,
		LONG_MAX: 180,
		LONG_MIN: -180
	};

	lat;
	long;

	constructor({lat = null, long = null} = {}) {
		if (typeof lat !== "number" || typeof long !== "number") {
			throw new Error("Arguments 'lat' and 'long' must be numbers");
		}

		if (lat < Hgeo_coord.LIMITS.LAT_MIN || lat > Hgeo_coord.LIMITS.LAT_MAX) {
			throw new RangeError("Latitude out of range");
		}

		if (long < Hgeo_coord.LIMITS.LONG_MIN || long > Hgeo_coord.LIMITS.LONG_MAX) {
			throw new RangeError("Longitude out of range");
		}

		this.lat = lat;
		this.long = long;
	}

	// Compute the flattened 1D representation of this coordinate pair
	// b = bit depth per dimension (if b = 40, then the 1D representation will fit into 80 bits)
	linearize(b = 40) {
		const lat = Hutil._float_to_normalized_int(this.lat + Math.abs(Hgeo_coord.LIMITS.LAT_MIN), 
			Hgeo_coord.LIMITS.LONG_MAX + Math.abs(Hgeo_coord.LIMITS.LONG_MIN), b);
		
		const long = Hutil._float_to_normalized_int(this.long + Math.abs(Hgeo_coord.LIMITS.LONG_MIN), 
			Hgeo_coord.LIMITS.LONG_MAX + Math.abs(Hgeo_coord.LIMITS.LONG_MIN), b);
		
		return Hutil._z_linearize_2d(lat, long, b);
	}
}

module.exports.Hgeo_coord = Hgeo_coord;