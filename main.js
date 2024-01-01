/**
 * BW 2023.11.13
 * This file draws a Chinese chess piece in animation. If WebGL is not supported,
 *  displays an error message instead.
 *
 * wood picture retrieved from https://kampshardwoods.com/product/white-oak/ &
 *   https://kampshardwoods.com/product/walnut/
 * granite picture from https://en.wikipedia.org/wiki/File:Fj%C3%A6regranitt3.JPG
 * wooden background from https://unsplash.com/photos/brown-parquet-board-wG923J9naFQ?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash
 *
 * TODO: Code Quality!!!
 */

'use strict';
import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {PieceFactory} from './piece.js';

(function() {
  window.addEventListener('load', init);

  const FRUSTUM_SIZE = 50;
  const scene = new THREE.Scene(); // the scene that holds all the objects
  const camera = setCamera(); // responsible for looking at the objects
  const renderer = new THREE.WebGLRenderer(); // renders the result on the page based on scene and camera
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let currentLayout = [
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
  ];

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
      scene.background = new THREE.TextureLoader().load('/public/background.jpg');

      const boardGeo = new THREE.BoxGeometry(46,51.8,4); // chessboard:45*50
      const texture = new THREE.TextureLoader().load('/public/whiteoak.jpg'); // TODO: get a new board texture
      const board = new THREE.Mesh(boardGeo, new THREE.MeshPhongMaterial({color: 0xffffff,map:texture}));
      board.position.set(0,0.4,-2.9); // piece height: 1.8, board height: 4. move upward so that the up & bottom margin seem to be the same length
      // board.rotation.x = Math.PI;
      const fontLoader = new FontLoader();
      board.receiveShadow = true;
      scene.add(board);

      const planeGeo = new THREE.PlaneGeometry(45,50);
      const patternTexture = new THREE.TextureLoader().load('/public/board.svg');
      const pattern = new THREE.Mesh(planeGeo,new THREE.MeshLambertMaterial({color: 0x000000, map: patternTexture, transparent:true}));
      pattern.position.z = -0.89;
      scene.add(pattern);

      try {
        const font = await fontLoader.loadAsync('./public/fz-ht-kai.json');
        const boardTextGeoL = new TextGeometry('楚河', {font:font, size:3,height:0, bevelEnabled:true,bevelThickness:0,bevelSize:0.07}); // bevel to make the font bold
        const boardTextGeoR = new TextGeometry('汉界', {font:font, size:3, height:0, bevelEnabled:true,bevelThickness:0,bevelSize:0.07});
        const boardTextL = new THREE.Mesh(boardTextGeoL, new THREE.MeshLambertMaterial({color: 0x000000}));
        const boardTextR = new THREE.Mesh(boardTextGeoR, new THREE.MeshLambertMaterial({color: 0x000000}));
        boardTextL.position.set(-12.5,-1.8,0);
        boardTextR.position.set(5, -1.8,0);
        scene.add(boardTextL);
        scene.add(boardTextR);
      } catch(err) {
        console.error(err);
      }

      setLighting();
      await defaultLayout();
      // await randomLayout();

      camera.position.z = 50*Math.cos(Math.PI/9);
      camera.position.y = -50*Math.sin(Math.PI/9);
      camera.lookAt(0,0,0);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(3); // my devicePixelRatio is 1.5. 3 will be ultra HD
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      window.addEventListener('resize', onWindowResize);

      document.getElementById('loading').classList.add('hidden');
      document.body.appendChild(renderer.domElement);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('click', onClick);
      animate();
    }
  }

  function onPointerMove(evt) {
    pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(evt.clientY / window.innerHeight) * 2 + 1;
  }

  async function defaultLayout() {
    const SCALE = 4.5/40;
    const LAYOUT = [
      // PieceSetting[][]:  [(lane1)[file1, file2, ..., file9], (lane2), ..., (lane10)] <= lane1=closest lane to me
      // PieceSetting: {team: int, type: char} for eampty space: undefined
      [{team: 1, type: 'R'},{team: 1, type: 'N'},{team: 1, type: 'E'},{team: 1, type: 'G'},{team: 1, type: 'K'},{team: 1, type: 'G'},{team: 1, type: 'E'},{team: 1, type: 'N'},{team: 1, type: 'R'}],
      [null,null,null,null,null,null,null,null,null],
      [null,{team: 1, type: 'C'},null,null,null,null,null,{team: 1, type: 'C'},null],
      [{team: 1, type: 'P'},null,{team: 1, type: 'P'},null,{team: 1, type: 'P'},null,{team: 1, type: 'P'},null,{team: 1, type: 'P'}],
      [null,null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null,null],
      [{team: 2, type: 'P'},null,{team: 2, type: 'P'},null,{team: 2, type: 'P'},null,{team: 2, type: 'P'},null,{team: 2, type: 'P'}],
      [null,{team: 2, type: 'C'},null,null,null,null,null,{team: 2, type: 'C'},null],
      [null,null,null,null,null,null,null,null,null],
      [{team: 2, type: 'R'},{team: 2, type: 'N'},{team: 2, type: 'E'},{team: 2, type: 'G'},{team: 2, type: 'K'},{team: 2, type: 'G'},{team: 2, type: 'E'},{team: 2, type: 'N'},{team: 2, type: 'R'}]
    ];

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        let setting = LAYOUT[i][j];
        if (setting) {
          PieceFactory.setProperty(setting.team, setting.type);
          const piece = await PieceFactory.createPiece();
          piece.scale.set(SCALE,SCALE,SCALE);
          piece.position.set(5*j-20,5*i-22.5,0);
          currentLayout[i][j] = piece.id;
          scene.add(piece);
        }
      }
    }
  }

  // an idea: cover the whole board with random pieces.
  async function randomLayout() {
    const SCALE = 4.5/40;
    const TYPES = "KGENRCP";
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 10; j++) {
        PieceFactory.setProperty(Math.floor(1+2*Math.random()),TYPES.charAt(Math.floor(7*Math.random())));
        let piece = await PieceFactory.createPiece();
        piece.scale.set(SCALE, SCALE, SCALE);
        piece.position.set(5*i-20,5*j-22.5,0);
        currentLayout[j][i] = piece.id;
        scene.add(piece);
      }
    }
  }

  /**
   * adds an error message to the site when WebGL implementation is missing.
   */
  function addErrorMsg() {
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

  function onClick() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length !== 0) {
      let intersect = intersects[0].point; // can't use object because it only sees the components
      let boardX = Math.floor((intersect.x + 22.5) /5);
      let boardY = Math.floor((intersect.y + 25) / 5);
      const selected = scene.getObjectById(currentLayout[boardY][boardX]);
      if (selected) {
        scene.traverse(function(object) {
          if (object.name === "piece") {
            object.rotation.x = 0;
            object.position.z = 0;
            let scale = 4.5/40;
            object.scale.set(scale,scale,scale);
          }
        });
        selected.rotation.x = - THREE.MathUtils.degToRad(20);
        selected.position.z = 2.4;
        let scale = 4.9/40;
        selected.scale.set(scale,scale,scale);
      } else {
        scene.traverse(function(object) {
          if (object.position.z === 2.4 && object.name === "piece") {
            object.rotation.x = 0;
            let originalX = Math.floor((object.position.x + 22.5) /5);
            let originalY = Math.floor((object.position.y + 25) / 5);
            object.position.set(5*boardX-20,5*boardY-22.5,0);
            let scale = 4.5/40;
            object.scale.set(scale,scale,scale);
            currentLayout[originalY][originalX] = null;
            currentLayout[boardY][boardX] = object.id;
          }
        })
      }
    }
  }

  /**
   * modify the piece for the next frame and renders. This allows the animation of the piece.
   */
  function animate() {
    requestAnimationFrame(animate);

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length !== 0) {
      let intersect = intersects[0].point; // can't use object because it only sees the components
      let boardX = Math.floor((intersect.x + 22.5) /5);
      let boardY = Math.floor((intersect.y + 25) / 5);
      const selected = scene.getObjectById(currentLayout[boardY][boardX]);
      scene.traverse(function(object) {
        if (object.name === "piece") {
          object.traverse(function(component) {
            if (!component.isGroup) { // traverse will cover the group itself
              component.material.emissive.setHex(0x000000);
            }
          });
        }
      });
      if (selected) {
        selected.traverse(function(component) {
          if (!component.isGroup) {
            component.material.emissive.setHex(0xbdc951);
          }
        })
      }
    }
    renderer.render(scene, camera);
  }

  /**
   * sets up the lighting within the scene.
   */
  function setLighting() {
    const environmentLight = new THREE.AmbientLight(0xcccccc, 2);
    scene.add(environmentLight);
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(-20,10,40); // direction: from position to (0,0,0) [default]
    light.castShadow = true;
    light.shadow.camera.left = -25; // these allow the light to cast shadow for everything that's within the camera
    light.shadow.camera.right = 25;
    light.shadow.camera.top = 30;
    light.shadow.camera.bottom = -30;
    light.shadow.mapSize.set(256,256);
    scene.add(light);

    // const helper = new THREE.CameraHelper(light.shadow.camera);
    // scene.add(helper);
  }
})();
