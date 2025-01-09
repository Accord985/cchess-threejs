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
    camera.position.set(0, -200, 250);  // 0, -200, 250
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

    let material = new THREE.MeshPhongMaterial({
      side: THREE.BackSide,
      color: 0xcc3333,
      specular: 0x3c3c3c,
      shininess: 30,
    });
    let chars = "帥將王仕士侍相象像馬車炮兵卒勇岩";
    let n = chars.length;
    let meshes = [];
    for (let i = 0; i < n; i++) {
      let geometry = await createTextGeometry(chars[i]);
      // let betterGeometry = createTextCarve(geometry);
      // geometry.dispose();
      // geometry = betterGeometry;

      let currMesh = new THREE.InstancedMesh(geometry, material, 2);
      let tempObj = new THREE.Object3D();
      tempObj.position.set((i - n / 2) * 50, -0.5 * 50, 0);
      tempObj.updateMatrix();
      currMesh.setMatrixAt(0, tempObj.matrix);
      tempObj.position.set((i - n / 2) * 50, 0.5 * 50, 0);
      tempObj.updateMatrix();
      currMesh.setMatrixAt(1, tempObj.matrix);

      meshes.push(currMesh);
      scene.add(currMesh);
    }
    material.dispose();

    animate();

    function animate() {
      requestAnimationFrame(animate);
      control.update();
      renderer.render(scene, camera);
    }
  }

  async function createTextGeometry(char) {
    if (char.length !== 1) { throw new Error("Only one character is accepted"); }
    let font = await loader.loadAsync('ar-yankai.json');
    const settings = {
      font: font,
      size: 30,
      depth: 0.4, height: 0.4
    };
    // 帥將王仕士侍相象像馬車炮兵卒勇岩
    const geometry = new TextGeometry(char, settings);
    return geometry;
  }
})();