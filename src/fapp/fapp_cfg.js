/** 
* FAPP_CFG
* Singleton for working with libfood.json  
* configuration files
*
*
*
*/ 

"use strict";

class Fapp_cfg {
  static ENV = {
    NODE: 0,
    BROWSER: 1,
    REACT_NATIVE: 2
  };
}

module.exports.Fapp_cfg = Fapp_cfg;
