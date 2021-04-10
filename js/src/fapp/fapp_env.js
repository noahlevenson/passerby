/** 
* FAPP_ENV
* Global environment settings
*
*
*
*
*/ 

"use strict";

class Fapp_env {
	static ENV_TYPE = {
		NODE: 0,
		BROWSER: 1,
		REACT_NATIVE: 2
	};

	static ENV = Fapp_env.ENV_TYPE.NODE;
	static SYS_BYTE_WIDTH = 8;
}

module.exports.Fapp_env = Fapp_env;