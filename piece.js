/**
 *
 * boundingbox is 39*39*16
 */

'use strict';
import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {SUBTRACTION, Brush, Evaluator} from 'three-bvh-csg';

export const PieceFactory = (function() {
  const SEGMENTS = 30; // take this number of segments when dealing with circles in the model
  const TEAMS = [
    new THREE.Color(0x666666), // grey/team0(stone)
    new THREE.Color(0xcc3333), // red/team1
    new THREE.Color(0x222222), // black/team2
    new THREE.Color(0x35967b)  // green/team3
  ];
  const CHARACTERS = {
    'K':'帥將王', // King
    'G':'仕士侍', // Guard
    'E':'相象像', // Elephant
    'N':'馬', // Knight
    'R':'車', // Rook
    'C':'炮', // Cannon
    'P':'兵卒勇', // Pawn
    'S':'岩' // Stone
  };

  /**
   * engraving options. Should only be integers -1, 0, or 1
   *  -1=char engraved inwards (there is precision & loading efficiency issues
   *  for this); 1=char protruding outwards; 0=flat char
   */
  const ENGRAVE = 1;

  /**
   * font options. Should only be integers 1 or 2
   *  1=lishu, 2=xingkai
   */
  const FONT_TYPE = 2;

  /**
   * texture options. Should only be integers
   *  1=white oak, 2=black oak, other=UV grid
   */
  const BASE_TYPE = 1;

  let team;
  let type;

  /**
   *
   * pieces with type S will have granite texture and team 0 regardless of given _type value
   * pieces without type S cannot be in team 0.
   * @param {int} _team
   * @param {char} _type
   */
  function setProperty(_team, _type) {
    team = (_team === 0) ? 1 : _team;
    type = _type;
    if (_type === 'S') {
      team = 0;
    }
  }

  async function createPiece() {
    let side = createSide();
    let surfaces = createSurfacesBrush();
    let carve = createCarveBrush();
    let text = await createTextBrush();
    let group = combineAsGroup(side,surfaces,carve,text);
    return group;
  }

  /**
   * creates a new material with a specific texture and the given settings.
   * @param {float} repeatX - number of time the texture is repeated across the surface in x direction
   * @param {float} repeatY - number of time the texture is repeated across the surface in y direction
   * @param {float} offsetX - the offset of the texture in x direction. defined by number of repetition of the texture
   * @param {float} offsetY - the offset of the texture in y direction. defined by number of repetition of the texture
   * @returns THREE.Material - a new instance of the material
   */
  function generateMaterial(repeatX, repeatY, offsetX, offsetY) {
    let fileName = 'uv_grid_opengl';
    if (team === 0) {
      fileName = 'granite';
    } else if (BASE_TYPE === 1) {
      fileName = 'whiteoak';
    } else if (BASE_TYPE === 2) {
      fileName = 'walnut';
    }
    // const map = new THREE.TextureLoader().load('public/uv_grid_opengl.jpg'); // for debugging
    const map = new THREE.TextureLoader().load('public/'+fileName+'.jpg'); // TODO: use regex
    map.wrapS = map.wrapT = THREE.RepeatWrapping; // texture infinitely repeats in both directions
    map.anisotropy = 32; // responsible for fidelity
    map.colorSpace = THREE.SRGBColorSpace; // needed for colored models
    map.repeat.set(repeatX, repeatY);
    map.offset.set(offsetX, offsetY);
    return new THREE.MeshPhongMaterial({map: map, side: THREE.FrontSide}); // wireframe:true
  }

  /**
 * creates the side of the piece.
 * @returns THREE.Mesh - the mesh that constitutes the side of the piece
 */
  function createSide() {
    const sideArc = new THREE.Path();
    sideArc.absellipse(15,0,4.5,8,-Math.PI/2,Math.PI/2);
    const points = sideArc.getSpacedPoints(10); // 10 point samples on the arc, evenly spaced

    // select random region in the original picture to generate the material
    const sideMat = generateMaterial(1, 0.14, 0, 0.83 * Math.random());
    const side = new THREE.Mesh(new THREE.LatheGeometry(points, SEGMENTS), sideMat);
    side.rotation.x = Math.PI/2;
    side.rotation.y = Math.PI;
    return side;
  }

  /**
   * creates the body of the piece, with surfaces, carve and text engrave combined.
   * @returns Brush (subclass of Mesh) - a brush that constitutes the body of the piece
   */
  function combineAsGroup(side,surfaces,carve, text) {
    let group = new THREE.Group();
    group.add(side);

    if (ENGRAVE >= 0) {
      group.add(surfaces);
      group.add(carve);
      group.add(text);
    } else {
      const evaluator = new Evaluator();
      let result = evaluator.evaluate(surfaces, carve, SUBTRACTION);
      result = evaluator.evaluate(result, text, SUBTRACTION);
      group.add(result);
    }
    return group;
  }

  /**
   * creates the brush for the surfaces of the piece (cylinder).
   * @returns Brush - a cylinder with wooden shiny texture
   */
  function createSurfacesBrush() {
    const surfaceMat = generateMaterial(0.25, 0.25, 0.75*Math.random(), 0.75*Math.random());
    const surfaces = new Brush(new THREE.CylinderGeometry(15, 15, 16, SEGMENTS), surfaceMat);
    surfaces.rotation.y = 2 * Math.PI / SEGMENTS * Math.floor(SEGMENTS * Math.random());
    surfaces.rotation.x = Math.PI/2;
    surfaces.updateMatrixWorld();
    return surfaces;
  }

  /**
   * creates the brush for the ring-like engrave on the piece.
   * @returns Brush - a ring with height and bevel, covered by somewhat rough texture
   */
  function createCarveBrush() {
    const carveShape = new THREE.Shape();
    carveShape.absarc(0,0,14.5,0,2*Math.PI);
    const holePath = new THREE.Path();
    holePath.absarc(0,0,13.5,0,2*Math.PI);
    carveShape.holes.push(holePath);
    const carveGeo = new THREE.ExtrudeGeometry(carveShape,{depth:0,bevelEnabled:ENGRAVE !== 0,bevelThickness:0.4});
    const carveMat = new THREE.MeshLambertMaterial({color: TEAMS[team]});
    const carve = new Brush(carveGeo, carveMat);
    carve.position.set(0,0,8.01); // add extra 0.01 so that in flat char case the objects don't conflict in space
    carve.updateMatrixWorld();
    return carve;
  }

  /**
   * creates the brush for the character engrave on the piece.
   * @returns Brush - a character with height and bevel, covered by somewhat rough texture
   */
  async function createTextBrush() {
    const fontLoader = new FontLoader();
    // restricted char set: (within parenthesis are json file names)
    // 方正行楷(fz-xingkai)&方正刘炳森隶书(fz-lbs-lishu)：帥將王仕士侍相象像馬車炮兵卒勇岩
    // 海体楷书(fz-ht-kai)：楚河汉界
    let fontName = 'nonexistent';
    if (FONT_TYPE === 1) {
      fontName = 'fz-lbs-lishu';
    } else if (FONT_TYPE === 2) {
      fontName = 'fz-xingkai';
    }
    try {
      let font = await fontLoader.loadAsync('/public/'+fontName+'.json'); // TODO: use regex
      let char = CHARACTERS[type].charAt(team-1) || CHARACTERS[type].charAt(0); // 'a' || 's' => 'a'; 's'.charAt(2) => ''; '' || 's' => 's'
      const geo = new TextGeometry(char, {font:font, size: 16, height:0, bevelEnabled:ENGRAVE !== 0, bevelThickness:0.4, bevelSize:0.4, bevelOffset:-0.4,bevelSegments:1});
      geo.computeBoundingBox(); // compute the bounding box and center the character at (0,0)
      const offsetX = -0.5*(geo.boundingBox.max.x+geo.boundingBox.min.x);
      const offsetY = -0.5*(geo.boundingBox.max.y+geo.boundingBox.min.y);
      const text = new Brush(geo, new THREE.MeshLambertMaterial({color: TEAMS[team]}));
      text.position.set(offsetX,offsetY,8.01);
      text.updateMatrixWorld();
      return text;
    } catch(err) {
      console.error(err);
      return new Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xffff00}));
    }
  }

  return {
    setProperty: setProperty,
    createPiece: createPiece
  };
})();