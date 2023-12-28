/**
 * BW 2023.11.13
 * This file draws a Chinese chess piece in animation. If WebGL is not supported,
 *  displays an error message instead.
 *
 * wood picture retrieved from https://kampshardwoods.com/product/white-oak/ &
 *   https://kampshardwoods.com/product/walnut/
 * granite picture from https://en.wikipedia.org/wiki/File:Fj%C3%A6regranitt3.JPG
 * wooden background from https://unsplash.com/photos/brown-parquet-board-wG923J9naFQ?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash
 */

'use strict';
import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {ADDITION, SUBTRACTION, Brush, Evaluator} from 'three-bvh-csg';

(function() {
  window.addEventListener('load', init);
  const SEGMENTS = 30; // take this number of segments when dealing with circles in the model
  const RED = new THREE.Color(0xcc3333);  // player1
  const BLACK = new THREE.Color(0x000000);  // player2
  const GREEN = new THREE.Color(0x35967b);  // player3
  const GREY = new THREE.Color(0x666666);  // this color is for stones

  const FRUSTUM_SIZE = 50;
  const scene = new THREE.Scene(); // the scene that holds all the objects
  const camera = setCamera(); // responsible for looking at the objects
  const renderer = new THREE.WebGLRenderer(); // renders the result on the page based on scene and camera

  function setCamera() {
    let aspect = window.innerWidth / window.innerHeight;
    let camera = new THREE.OrthographicCamera(-FRUSTUM_SIZE*aspect/2,FRUSTUM_SIZE*aspect/2,FRUSTUM_SIZE/2,-FRUSTUM_SIZE/2,0.1,100);
    return camera;
  }

  async function init() {
    if (!WebGL.isWebGLAvailable()) {
      addErrorMsg();
      throw new Error('WebGL not supported');
    } else {
      scene.background = new THREE.TextureLoader().load('/public/whiteoak.jpg');
      setLighting();

      const group = new THREE.Group();
      group.add(createSide());
      group.add(await createBody());
      scene.add(group);

      camera.position.z = 50;
      renderer.setSize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', onWindowResize);

      document.getElementById('loading').classList.add('hidden');
      document.body.appendChild(renderer.domElement);
      animate();
    }
  }

  /**
   * adds an error message to the site when WebGL implementation is missing.
   */
  async function addErrorMsg() {
    const warning = WebGL.getWebGLErrorMessage();
    const message = document.createElement('section');
    message.id = 'graphic-error';
    message.appendChild(warning);
    document.body.appendChild(message);
  }

  /**
   * Adapts the renderer and the camera to the window size.
   */
  function onWindowResize() {
    let aspect = window.innerWidth / window.innerHeight;
    camera.left = -FRUSTUM_SIZE*aspect/2;
    camera.right = FRUSTUM_SIZE*aspect/2;
    camera.top = FRUSTUM_SIZE/2;
    camera.bottom = -FRUSTUM_SIZE/2;
    camera.updateProjectionMatrix(); // update the change into the camera
    renderer.setSize(window.innerWidth, window.innerHeight); // re-render
  }

  /**
   * modify the piece for the next frame and renders. This allows the animation of the piece.
   */
  function animate() {
    requestAnimationFrame(animate);
    scene.traverse((object)=>{
      if (object.isGroup) {
        let time = Date.now() * 0.001;
        object.rotation.x = - THREE.MathUtils.degToRad(35+10*Math.sin(2 * time)); // 25-45deg
      }
    });
    renderer.render(scene, camera);
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
    // const map = new THREE.TextureLoader().load('public/uv_grid_opengl.jpg');
    const map = new THREE.TextureLoader().load('public/whiteoak.jpg');
    map.wrapS = map.wrapT = THREE.RepeatWrapping; // texture infinitely repeats in both directions
    map.anisotropy = 32; // responsible for fidelity
    map.colorSpace = THREE.SRGBColorSpace; // needed for colored models
    map.repeat.set(repeatX, repeatY);
    map.offset.set(offsetX, offsetY);
    return new THREE.MeshPhongMaterial({map: map, side: THREE.FrontSide}); // wireframe:true
  }

  /**
   * sets up the lighting within the scene.
   */
  function setLighting() {
    const ambientLight = new THREE.AmbientLight(0xcccccc, 3);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 3.5, 0, 0);
    pointLight.position.set(-5,10,40);
    scene.add(pointLight);
    // const sphereSize = 1;
    // const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
    // scene.add(pointLightHelper);
  }

  /**
   * creates the side of the piece.
   * @returns THREE.Mesh - the mesh that constitutes the side of the piece
   */
  function createSide() {
    const sideArc = new THREE.Path();
    sideArc.absellipse(15,0,4,8,-Math.PI/2,Math.PI/2);
    const points = sideArc.getSpacedPoints(10); // 10 point samples on the arc, evenly spaced

    // select random region in the original picture to generate the material
    const sideMat = generateMaterial(1, 0.17, 0, 0.83 * Math.random());
    const side = new THREE.Mesh(new THREE.LatheGeometry(points, SEGMENTS), sideMat);
    side.rotation.x = Math.PI/2;
    side.rotation.y = Math.PI;
    return side;
  }

  /**
   * creates the body of the piece, with surfaces, carve and text engrave combined.
   * @returns Brush (subclass of Mesh) - a brush that constitutes the body of the piece
   */
  async function createBody() {
    let surfaces = createSurfacesBrush();
    let carve = createCarveBrush();
    let text = await createTextBrush();

    const evaluator = new Evaluator();
    let result = evaluator.evaluate(surfaces, carve, SUBTRACTION);
    result = evaluator.evaluate(result, text, SUBTRACTION);
    return result;
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
    const carveGeo = new THREE.ExtrudeGeometry(carveShape,{depth:0,bevelThickness:0.4});
    const carveMat = new THREE.MeshLambertMaterial({color:RED});
    const carve = new Brush(carveGeo, carveMat);
    carve.position.set(0,0,8);
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
    // 方正行楷(fz-xingkai)&方正刘炳森隶书(fz-lbs-lishu)：車馬炮仕士侍相象像將帥王兵卒勇岩
    // 海体楷书(fz-ht-kai)：楚河汉界
    try {
      let font = await fontLoader.loadAsync('/public/fz-lbs-lishu.json');
      const geo = new TextGeometry('帥', {font:font, size: 16, height:0, bevelEnabled:true, bevelThickness:0.4, bevelSize:0.4, bevelOffset:-0.4,bevelSegments:1});
      geo.computeBoundingBox(); // compute the bounding box and center the character at (0,0)
      const offsetX = -0.5*(geo.boundingBox.max.x+geo.boundingBox.min.x);
      const offsetY = -0.5*(geo.boundingBox.max.y+geo.boundingBox.min.y);
      const text = new Brush(geo, new THREE.MeshLambertMaterial({color: RED}));
      text.position.set(offsetX,offsetY,8);
      text.updateMatrixWorld();
      return text;
    } catch(err) {
      console.error(err);
      return new Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xffff00}));
    }
  }
})();
