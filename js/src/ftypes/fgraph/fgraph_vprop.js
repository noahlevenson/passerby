/** 
* FGRAPH_VPROP
* Encapsulates vertex properties used by graph search algorithms
* 
* 
*
*
*/ 

"use strict";

class Fgraph_vprop {
  static COLOR = {
    WHITE: 0,
    BLACK: 1
  };

  color;
  d;
  f;
  pi;
  label;

  constructor({color, d, f, pi, label} = {}) {
    this.color = color;
    this.d = d;
    this.f = f;
    this.pi = pi;
    this.label = label;
  }
}

module.exports.Fgraph_vprop = Fgraph_vprop;