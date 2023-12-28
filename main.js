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
// PieceFactory.setProperty(1,'帥');

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
      scene.background = new THREE.TextureLoader().load('/public/whiteoak.jpg');
      setLighting();

      PieceFactory.setProperty(1,'K');
      let k = await PieceFactory.createPiece();
      k.scale.set(0.3,0.3,0.3);
      k.position.set(-25, 0,0);
      scene.add(k);
      PieceFactory.setProperty(2,'N');
      let n = await PieceFactory.createPiece();
      n.position.set(25,0,0);
      scene.add(n);

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


})();
