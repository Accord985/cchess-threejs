/**
 * BW 2024.12.15
 * This file is generates a text character.
 */

'use strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as QT from './QuadTree.js';

(function() {
  const VIEW_WIDTH = 450;
  const VIEW_HEIGHT = 500;
  const aspect = VIEW_WIDTH / VIEW_HEIGHT;
  const frustumSize = 500;
  const loader = new FontLoader();

  let start = Date.now();
  init();
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

    let geometry = await createTextCarve();

    // let wireframe = new THREE.WireframeGeometry(geometry);
    // const line = new THREE.LineSegments( wireframe );
    // line.material.depthTest = false;
    // line.material.opacity = 0.25;
    // line.material.transparent = true;
    // scene.add( line );

    let material = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0xcc3333,
      specular: 0x3c3c3c,
      shininess: 30,
    });
    let pieces = new THREE.Mesh(geometry, material);
    scene.add(pieces);

    geometry.dispose();
    material.dispose();

    animate();

    function animate() {
      requestAnimationFrame(animate);
      control.update();
      renderer.render(scene, camera);
    }
  }

  async function createTextCarve() {
    let outline = await createTextOutline();
    let pointsBuffer = createCarve(outline.shapes, outline.holes);
    let geometry = new THREE.BufferGeometry().setFromPoints(pointsBuffer);
    return geometry;
  }

  function createCarve(shapes, holes) {
    console.log(QT);
    let qt = new QT.QuadTree(new QT.Rectangle(200,200,200,200), 4);
    // for (let i = 0; i < 5; i++) {
    //   qt.insert(new QT.Point(200+Math.random()*200,200+Math.random()*200));
    // }
    // console.log(qt);
    let maxDistance = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < shapes.length; i++) {
      let shape = shapes[i];
      if (shape[0].x < minX) {minX = shape[0].x};
      if (shape[0].x > maxX) {maxX = shape[0].x};
      if (shape[0].y < minY) {minY = shape[0].y};
      if (shape[0].y > maxY) {maxY = shape[0].y};
      for (let j = 0; j < shape.length - 1; j++) {
        let distance = new THREE.Vector2().subVectors(shape[j], shape[j+1]).length();
        if (distance > maxDistance) {maxDistance = distance;}
        if (shape[j+1].x < minX) {minX = shape[j+1].x};
        if (shape[j+1].x > maxX) {maxX = shape[j+1].x};
        if (shape[j+1].y < minY) {minY = shape[j+1].y};
        if (shape[j+1].y > maxY) {maxY = shape[j+1].y};
      }
    }
    let shapePoints = new QT.QuadTree(new QT.Rectangle(minX, minY, maxX - minX, maxY - minY), 4);
    let shapeEdges = new QT.QuadTree(new QT.Rectangle(minX, minY, maxX - minX, maxY - minY), 4);
    for (let i = 0; i < shapes.length; i++) {
      let shape = shapes[i];
      shapePoints.insert(new QT.Point(shape[shape.length - 1].x, shape[shape.length - 1].y));
      shapeEdges.insert(new QT.Edge(new QT.Point(shape[shape.length - 1].x, shape[shape.length - 1].y), new QT.Point(shape[0].x, shape[0].y)));
      for (let j = 0; j < shape.length - 1; j++) {
        shapePoints.insert(new QT.Point(shape[j].x, shape[j].y));
        shapeEdges.insert(new QT.Edge(new QT.Point(shape[j].x, shape[j].y), new QT.Point(shape[j+1].x, shape[j+1].y)))
      }
    }
    console.log(maxDistance);
    console.log(`x from ${minX} to ${maxX}, y from ${minY} to ${maxY}`);
    console.log(shapePoints);
    console.log(shapeEdges);

    return [];
  }

  async function createTextOutline() {
    let font = await loader.loadAsync('ar-yankai.json');
    const settings = {
      font: font,
      size: 16,
    };
    // 帥將王仕士侍相象像馬車炮兵卒勇岩
    const geometry = new TextGeometry('帥', settings);
    let shapes = geometry.parameters.shapes;  // an array of shapes
    let combinedOutline = {shapes: [], holes: []};
    for (let i = 0; i < shapes.length; i++) {
      let dotOutline = shapes[i].extractPoints(20);  // an object {shape: Vector3[], holes: Vector3[][]}
      combinedOutline.shapes.push(dotOutline.shape);
      for (let j = 0; j < dotOutline.holes.length; j++) {
        combinedOutline.holes.push(dotOutline.holes[j]);
      }
    }  // after this you have shapes and holes as 2 arrays of vectors
    return combinedOutline;
  }
})();