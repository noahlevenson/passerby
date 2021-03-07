/** 
* HDLT_MSG
* The HDLT_MSG type encapsulates and provides a simple 
* interface for interrogating the contents of HDLT messages
* 
*
*
*/ 

"use strict";

class Hdlt_msg {
	static ID_LEN = 12;

	static TYPE = {
		REQ: 0,
		RES: 1
	};

	// Our messages are similar to Bitcoin, but we currently use them in a mostly unsolicited
	// fashion - nodes just broadcast blocks as TX and BLOCK messages without first sending
	// an INV. INV is only used in response to a GETBLOCKS so that block requesters can 
	// iteratively request blocks, throttling their requests
	static FLAVOR = {
		TX: 0,
		BLOCK: 1,
		GETBLOCKS: 2,
		GETDATA: 3,
		INV: 4
	};

	data;
	type;
	flavor;
	app_id;
	id;

	constructor({data = null, type = null, flavor = null, app_id = null, id = null} = {}) {
		// Mostly for sanity during development: explicitly require values 
		if (data === null || type === null || flavor === null || app_id === null || id === null) {
			throw new Error("Arguments cannot be null");
		}

		this.data = data;
		this.type = type;
		this.flavor = flavor;
		this.app_id = app_id;
		this.id = id;
	}
};

module.exports.Hdlt_msg = Hdlt_msg;