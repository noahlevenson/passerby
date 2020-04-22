"use strict";

const { Hgeo_coord } = require("./hgeo_coord.js"); // DELETE ME!!!!
const { Hutil } = require("../hutil/hutil.js"); // DELETE ME!!!!!

// Hgeo is a singleton that provides methods for working with location data
class Hgeo {
	// Or does it?  Do we even need this namespace?
}

// La Rosa's coords:
// 40.9018663,-73.7912739

const larosa = new Hgeo_coord({lat: 40.9018663, long: -73.7912739});

console.log(larosa);

const result = larosa.linearize()

console.log(result);

