"use strict";

const { Hgeo_coord } = require("./hgeo_coord.js"); // DELETE ME!!!!
const { Hutil } = require("../hutil/hutil.js"); // DELETE ME!!!!!

// Hgeo is a singleton that provides methods for working with location data
class Hgeo {
	// Or does it?  Do we even need this namespace?
}

// La Rosa's coords:
// 40.9018663,-73.7912739

// const larosa = new Hgeo_coord({lat: 40.9018663, long: -73.7912739});

// console.log(larosa);

// larosa.linearize()


// you can normalize to positive values by adding the absolute value of the smallest possible value

// then how do we normalize a real number to an integer?

// to go from integer to float, you do (where b is the bit depth of the integer:  float = int / (2^b - 1)

// to go from float to integer, you do:  float * (2^b - 1)



Hutil.z_linearize2d(0b1111111111111111111111111111111111111111111111111111111111111111111111111, 0b1111111111111111111111111111111111111111111111111111111111111111111111111, 40);
