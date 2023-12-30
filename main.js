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
import { PieceFactory } from './piece.js';

(function() {
  window.addEventListener('load', init);

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
      scene.background = new THREE.TextureLoader().load('/public/background.jpg');

      const boardGeo = new THREE.BoxGeometry(46,51.8,4); // chessboard:45*50
      const texture = new THREE.TextureLoader().load('/public/whiteoak.jpg');

      const board = new THREE.Mesh(boardGeo, new THREE.MeshPhongMaterial({color: 0xffffff,map:texture}));
      board.position.set(0,0.4,-3.2); // piece height: 2.4, board height: 4. move upward so that the up & bottom margin seem to be the same length
      // board.rotation.x = Math.PI;
      board.receiveShadow = true;
      scene.add(board);

      setLighting();
      const SCALE = 4.5/40;

      const TYPES = "KGENRCP";
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 10; j++) {
          PieceFactory.setProperty(Math.floor(1+2*Math.random()),TYPES.charAt(Math.floor(7*Math.random())));
          let piece = await PieceFactory.createPiece();
          piece.scale.set(SCALE, SCALE, SCALE);
          piece.position.set(5*i-20,5*j-22.5,0);
          scene.add(piece);
        }
      }

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
        // object.rotation.x = - THREE.MathUtils.degToRad(10+10*Math.sin(2 * time)); // 0-20deg
        // object.position.z = 1.5+1.5*Math.sin(2*time); // 0-3
        // let scale = (4.7+0.2*Math.sin(2*time))/40; // 4.5-4.9
        // object.scale.set(scale,scale,scale);
        // object.rotation.x += 0.01;
        // object.rotation.y += 0.01;
      }
    });
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
