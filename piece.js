'use strict';
import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {ADDITION, SUBTRACTION, Brush, Evaluator} from 'three-bvh-csg';

const Piece = (function() {
  let color;
  let type;

  function setProperty(color, type) {
    this.color = color;
    this.type = type;
  }

  function display() {
    return 'color: '+this.color+' type: '+this.type;
  }

  return {
    setProperty: setProperty,
    display: display
  };
})();
Piece.setProperty('red','車');
const ju = Piece.display();
Piece.setProperty('black','馬');
const ma = Piece.display();
console.log(ju);
console.log(ma);