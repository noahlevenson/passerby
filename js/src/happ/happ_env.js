/** 
* HAPP_ENV
* Global environment settings
*
*
*
*
*/ 

"use strict";

class Happ_env {
	static ENV_TYPE = {
		NODE: 0,
		BROWSER: 1,
		REACT_NATIVE: 2
	};

	static ENV = Happ_env.ENV_TYPE.NODE;
	static SYS_BYTE_WIDTH = 8;
}

module.exports.Happ_env = Happ_env;