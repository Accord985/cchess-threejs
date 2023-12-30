'use strict';
import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {ADDITION, SUBTRACTION, Brush, Evaluator} from 'three-bvh-csg';
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
      scene.background = new THREE.Color(0x777777);
      //Create a DirectionalLight and turn on shadows for the light
      const light = new THREE.DirectionalLight( 0xffffff, 10 );
      light.position.set( 0, 10, 0 ); //default; light shining from top
      light.castShadow = true; // default false
      scene.add( light );

      //Set up shadow properties for the light
      light.shadow.mapSize.width = 512; // default
      light.shadow.mapSize.height = 512; // default
      light.shadow.camera.near = 0.5; // default
      light.shadow.camera.far = 500; // default

      //Create a sphere that cast shadows (but does not receive them)
      const sphereGeometry = new THREE.SphereGeometry( 5, 32, 32 );
      const sphereMaterial = new THREE.MeshStandardMaterial( { color: 0xff0000 } );
      const sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );
      sphere.castShadow = true; //default is false
      sphere.receiveShadow = false; //default
      scene.add( sphere );

      //Create a plane that receives shadows (but does not cast them)
      const planeGeometry = new THREE.PlaneGeometry( 20, 20, 32, 32 );
      const planeMaterial = new THREE.MeshStandardMaterial( { color: 0xffffff } )
      const plane = new THREE.Mesh( planeGeometry, planeMaterial );
      plane.receiveShadow = true;
      scene.add( plane );

      //Create a helper for the shadow camera (optional)
      const helper = new THREE.DirectionalLightHelper( light );
      scene.add( helper );

      // scene.background = new THREE.TextureLoader().load('/public/whiteoak.jpg');
      // setLighting();

      // let g = new THREE.Group();
      // g.add(await createText());
      // scene.add(g);

      camera.position.z = 5;
      renderer.setSize(window.innerWidth, window.innerHeight);
      // window.addEventListener('resize', onWindowResize);

      document.getElementById('loading').classList.add('hidden');
      document.body.appendChild(renderer.domElement);
      animate();
    }
  }

  async function createText() {
    let fontLoader = new FontLoader();
    try {
      let font = await fontLoader.loadAsync('/public/fz-xingkai.json');
      const geo = new TextGeometry('馬', {font:font, size: 16, height:0, bevelEnabled:false, bevelThickness:0.4, bevelSize:0.4, bevelOffset:-0.4,bevelSegments:1});
      geo.computeBoundingBox(); // compute the bounding box and center the character at (0,0)
      const offsetX = -0.5*(geo.boundingBox.max.x+geo.boundingBox.min.x);
      const offsetY = -0.5*(geo.boundingBox.max.y+geo.boundingBox.min.y);
      const text = new Brush(geo, new THREE.MeshLambertMaterial({color: 0x049ef4}));
      text.position.set(offsetX,offsetY,8);
      text.updateMatrixWorld();
      return text;
    } catch(err) {
      console.error(err);
      return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xffff00}));
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
        object.rotation.x += 0.01;
        object.rotation.y += 0.01;
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