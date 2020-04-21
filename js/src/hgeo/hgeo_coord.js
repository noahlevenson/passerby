const { Hutil } = require("../hutil/hutil.js");

// Class for an hgeo latitude / longitude coordinate
class Hgeo_coord {
	static LIMITS = {
		LONG_MAX: 180,
		LONG_MIN: -180,
		LAT_MAX: 90,
		LAT_MIN: -90
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
		const lat = Hutil.normalize_int(this.lat + Math.abs(Hgeo_coord.LIMITS.LAT_MIN), b);
		const long = Hutil.normalize_int(this.long + Math.abs(Hgeo_coord.LIMITS.LONG_MIN), b);
		

		// console.log(lat)
		// console.log(long)

		// return Hutil.z_linearize(long, lat);
	}
}

module.exports.Hgeo_coord = Hgeo_coord;