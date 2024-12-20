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
    camera.position.set(0,0,250);  // 0, -200, 250
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

    // let points = new THREE.Points(geometry, new THREE.PointsMaterial({size: 1}));
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

    // let points = [];
    // for (let i = 0; i < 128; i++) {
    //   let currX = findNthSampleValue(2.926, 16.12092, i);
    //   for (let j = 0; j < 128; j++) {
    //     let currY = findNthSampleValue(-2.9978, 21.1428, j);
    //     points.push(new THREE.Vector3(currX, currY, 0));
    //   }
    // }
    // let bufferGeo = new THREE.BufferGeometry().setFromPoints(points);
    // scene.add(new THREE.Points(bufferGeo, new THREE.PointsMaterial({size: 2})));

    // let bufferGeo2 = new THREE.BufferGeometry().setFromPoints([
    //   new THREE.Vector2(2.98897234375, 5.01333),
    // ]);
    // scene.add(new THREE.Points(bufferGeo2, new THREE.PointsMaterial({size: 4, color: 0xffff00})));


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
    let font = await loader.loadAsync('ar-yankai.json');
    const settings = {
      font: font,
      size: 16,
      depth: 0.4, height: 0.4
    };
    // 帥將王仕士侍相象像馬車炮兵卒勇岩
    const geometry = new TextGeometry('馬', settings);
    return geometry;
  }
})();

function findNthSampleValue(min , rangeSpan, n) {
  if (!Number.isInteger(n) || !Number.isInteger(128)) {
    throw new Error("index n and resolution should both be integers");
  }
  if (n >= 128 || n < 0) {
    throw new Error("n should be 0-based index from 0 to resolution-1");
  }
  return min + (n + 0.5) / 128 * rangeSpan;
}