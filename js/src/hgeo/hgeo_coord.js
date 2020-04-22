const { Hutil } = require("../hutil/hutil.js");

// Class for an hgeo latitude / longitude coordinate
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
			throw new Error("Bro you messed up your params");
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

	// b = bit depth per dimension
	linearize(b = 40) {
		const lat = Hutil._float_to_normalized_int(this.lat + Math.abs(Hgeo_coord.LIMITS.LAT_MIN), 
			Hgeo_coord.LIMITS.LONG_MAX + Math.abs(Hgeo_coord.LIMITS.LONG_MIN), b);
		
		const long = Hutil._float_to_normalized_int(this.long + Math.abs(Hgeo_coord.LIMITS.LONG_MIN), 
			Hgeo_coord.LIMITS.LONG_MAX + Math.abs(Hgeo_coord.LIMITS.LONG_MIN), b);
		
		return Hutil._z_linearize_2d(lat, long, b);
	}
}

module.exports.Hgeo_coord = Hgeo_coord;