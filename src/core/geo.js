"use strict";

const { rescale_float, morton_remap_2d } = require("./math.js");
const { Bigboy } = require("./types/bigboy.js");

const LAT_MINUTES_MILES = 1.15;
const LON_MINUTES_MILES = 0.91;
const MINUTES_PER_DEGREE = 60;

const LIMITS = {
  LAT_MAX: 90,
  LAT_MIN: -90,
  LON_MAX: 180,
  LON_MIN: -180
};

class Coord {
  constructor({lat, lon} = {}) {
    this.lat = lat;
    this.lon = lon;
  }

  /**
   * Map this 2D coordinate pair to one dimension using a space-filling curve. 'b' is the bit 
   * domain per dimension; i.e., for b = 40, the 1D representation will scale to the domain of 80 bits
   */
  linearize(b = 40) {
    const lat = rescale_float(this.lat + Math.abs(LIMITS.LAT_MIN), 
      LIMITS.LON_MAX + Math.abs(LIMITS.LON_MIN), b);

    const lon = rescale_float(this.lon + Math.abs(LIMITS.LON_MIN), 
      LIMITS.LON_MAX + Math.abs(LIMITS.LON_MIN), b);

    /**
     * TODO: We awkwardly coerce rescaled integers to Bigboys using the hex string constructor 
     * because Bigboy's default constructor is only guaranteed for 32-bit numbers
     */ 
    return morton_remap_2d(
      Bigboy.from_hex_str({len: b / 8, str: lat.toString(16)}), 
      Bigboy.from_hex_str({len: b / 8, str: lon.toString(16)})
    );
  }

  /**
   * Compute the Coord pairs representing a square window with extremities 'd' miles equidistant 
   * from this Coord, aka: CENTER [plus or minus] (DISTANCE / MINUTES_PER_MILE / MINUTES_PER_DEGREE)
   */ 
  get_exts(d) {
    const lat_offset = d / LAT_MINUTES_MILES / MINUTES_PER_DEGREE;
    const lon_offset = d / LON_MINUTES_MILES / MINUTES_PER_DEGREE;
    const left = this.lon - lon_offset; 
    const right = this.lon + lon_offset;
    const bottom = this.lat - lat_offset;
    const top = this.lat + lat_offset;
    return new Rect({left: left, right: right, top: top, bottom: bottom});
  }
}

class Rect {
  constructor({left, right, top, bottom} = {}) {
    this.min = new Coord({lat: bottom, lon: left});
    this.max = new Coord({lat: top, lon: right});
  }

  get_min() {
    return this.min;
  }

  get_max() {
    return this.max;
  }
}

module.exports = { Coord, Rect };
