/** 
* HSTUN_CONTAINER
* Data structures used by HSTUN
* 
* 
* 
* 
*/ 

"use strict";

class Hstun_type_data {
	constructor(type = null, bin = null, f = null) {
		this.type = type;
		this.bin = bin;
		this.f = f;
	}
}

module.exports.Hstun_type_data = Hstun_type_data;