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
    // geometry.dispose();
    // geometry = betterGeometry;

    // let wireframe = new THREE.WireframeGeometry(geometry);
    // const line = new THREE.LineSegments( wireframe );
    // line.material.depthTest = false;
    // line.material.opacity = 0.25;
    // line.material.transparent = true;
    // scene.add( line );

    let points = new THREE.Points(betterGeometry, new THREE.PointsMaterial({size: 1.5}));
    scene.add(points);

    let material = new THREE.MeshPhongMaterial({
      side: THREE.BackSide,
      color: 0xcc3333,
      specular: 0x3c3c3c,
      shininess: 30,
    });
    let pieces = new THREE.Mesh(geometry, material);
    // scene.add(pieces);

    // let bufferGeo = new THREE.BufferGeometry().setFromPoints([
    //   new THREE.Vector2(141.42249999999999, 17.039),
    //   new THREE.Vector2(145.633, 17.039),
    //   new THREE.Vector2(146.76945687203792, 17.039),
    //   new THREE.Vector2(141.624025, 17.039),
    //   new THREE.Vector2(148.66328372093022, 17.039),
    //   new THREE.Vector2(161.42888946322066 , 17.039),
    //   new THREE.Vector2(167.7557714285714, 17.039),
    //   new THREE.Vector2(165.8607350272232, 17.039),
    //   new THREE.Vector2(171.14161285714283, 17.039),
    //   new THREE.Vector2(184.28274571890145, 17.039),
    //   new THREE.Vector2(185.27401777777774, 17.039),
    //   new THREE.Vector2(187.90612389092388, 17.039),
    //   new THREE.Vector2(190.51521889763777, 17.039),
    //   new THREE.Vector2(192.6754, 17.039),
    //   new THREE.Vector2(194.69841510791366, 17.039),
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
    let font = await loader.loadAsync('ar-yankai.json');
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