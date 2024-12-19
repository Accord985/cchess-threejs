/**
 * BW 2024.12.15
 * This file is generates a text character.
 */

'use strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { createTextCarve } from './createTextCarve.js';
// import * as TCC from './createTextCarve.js';
// import './createTextCarve.js';

(async function() {
  const VIEW_WIDTH = 450;
  const VIEW_HEIGHT = 500;
  const aspect = VIEW_WIDTH / VIEW_HEIGHT;
  const frustumSize = 500;
  const loader = new FontLoader();

  let start = Date.now();
  await init();
  console.log(`Finished, spent ${Date.now()-start}ms`);

  async function init() {
    // basic setup: camera, scene, renderer, and control
    let camera = new THREE.OrthographicCamera(frustumSize*aspect/-2,frustumSize*aspect/2,frustumSize/2,frustumSize/-2,0.1,2000);
    // let camera = new THREE.PerspectiveCamera();
    let scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcfbc46);
    scene.add(camera);
    let renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(450, 500);
    document.body.appendChild(renderer.domElement);
    let control = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0,-200,250);
    camera.lookAt(0,0,0);
    control.update();

    // lighting
    let light = new THREE.DirectionalLight(0xffffff, 4);  // dark-mode: 2
    light.position.set(0,-8,16);
    scene.add(light);
    // let helper = new THREE.DirectionalLightHelper(light);
    // scene.add(helper);
    let ambient = new THREE.AmbientLight(0xbbbbbb, 2);
    scene.add(ambient);

    let geometry = await createTextGeometry();
    let betterGeometry = createTextCarve(geometry);
    geometry.dispose();
    geometry = betterGeometry;

    // let wireframe = new THREE.WireframeGeometry(geometry);
    // const line = new THREE.LineSegments( wireframe );
    // line.material.depthTest = false;
    // line.material.opacity = 0.25;
    // line.material.transparent = true;
    // scene.add( line );

    // let points = new THREE.Points(betterGeometry, new THREE.PointsMaterial({size: 1.5}));
    // scene.add(points);

    let material = new THREE.MeshPhongMaterial({
      side: THREE.BackSide,
      color: 0xcc3333,
      specular: 0x3c3c3c,
      shininess: 30,
    });
    let pieces = new THREE.Mesh(geometry, material);
    // console.log(geometry);
    scene.add(pieces);

    // let bufferGeo = new THREE.BufferGeometry().setFromPoints([
    //   new THREE.Vector2(1.784305625, 7.774100312500002),
    //   new THREE.Vector2(5.808089289470061, 7.774100312500002),
    //   new THREE.Vector2(3.13953368806306, 7.774100312500002),
    //   new THREE.Vector2(7.210816200096002, 7.774100312500002),
    //   new THREE.Vector2(11.177009915123456, 7.774100312500002),
    //   new THREE.Vector2(10.416920684347984, 7.774100312500002),
    //   new THREE.Vector2(18.6560000, 7.774100312500002),
    // ]);
    // scene.add(new THREE.Points(bufferGeo, new THREE.PointsMaterial({size: 3})));


    // geometry.dispose();
    // material.dispose();

    animate();

    function animate() {
      requestAnimationFrame(animate);
      control.update();
      renderer.render(scene, camera);
    }
  }

  async function createTextGeometry() {
    let font = await loader.loadAsync('fz-xingkai.json');
    const settings = {
      font: font,
      size: 16,
      depth: 0.4, height: 0.4
    };
    // 帥將王仕士侍相象像馬車炮兵卒勇岩
    const geometry = new TextGeometry('相', settings);
    return geometry;
  }
})();