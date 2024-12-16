
/**
 * BW 2024.11.27
 * This file is generates a base with drum shaped geometry.
 */

'use strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(function() {
  const VIEW_WIDTH = 450;
  const VIEW_HEIGHT = 500;
  const aspect = VIEW_WIDTH / VIEW_HEIGHT;
  const frustumSize = 500;
  let highLightInstanceId = -1;
  let selectedInstanceId = -1;
  let selectTransform = calcTransformMatrix();
  let unselectTransform = new THREE.Matrix4().copy(selectTransform).invert();

  function calcTransformMatrix() {
    let result = new THREE.Matrix4();
    result.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 18));  // apply rotation transformation
    result.multiply(new THREE.Matrix4().makeScale(1.1, 1.1, 1.1));
    result.multiply(new THREE.Matrix4().makeTranslation(0,0,2.4));
    return result;
  }

  let start = Date.now();
  init();
  console.log(`Finished, spent ${Date.now()-start}ms`);

  function init() {
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
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(1, 1);
    renderer.domElement.addEventListener('mousemove', (event) => {
      event.preventDefault();
      // normalize to [-1,1]
      mouse.x = (event.offsetX / VIEW_WIDTH) * 2 - 1;  // offsetX: the x coord within the element
      mouse.y = - (event.offsetY / VIEW_HEIGHT) * 2 + 1;
    });
    renderer.domElement.addEventListener('click', () => {
      const intersects = raycaster.intersectObject(pieces);
      if (intersects.length > 0 && selectedInstanceId !== intersects[0].instanceId) {
        let instanceId = intersects[0].instanceId;
        transformInstance(instanceId, selectTransform);
        transformInstance(selectedInstanceId, unselectTransform);
        selectedInstanceId = instanceId;
      } else {
        transformInstance(selectedInstanceId, unselectTransform);
        selectedInstanceId = -1;
      }
    });

    function transformInstance(instanceId, transformMatrix) {
      let pieceMatrix = new THREE.Matrix4();
      pieces.getMatrixAt(instanceId, pieceMatrix);
      pieceMatrix.multiply(transformMatrix);
      pieces.setMatrixAt(instanceId, pieceMatrix);
      pieces.instanceMatrix.needsUpdate = true;
    }

    // lighting
    let light = new THREE.DirectionalLight(0xffffff, 4);  // dark-mode: 2
    light.position.set(0,-8,16);
    scene.add(light);
    // let helper = new THREE.DirectionalLightHelper(light);
    // scene.add(helper);
    let ambient = new THREE.AmbientLight(0xbbbbbb, 2);
    scene.add(ambient);

    // create a drum-shape piece with surface radius 15, thinkness 16, and largest radius at the center plane 20.
    // built-in Extrude geometry uses an unknown path for the bevel. The uv attributes are unknown.
    // the buffer geometry I built uses a ellipse for the shape of the side
    // let geometry = createWithExtrudeGeometry();
    let geometry = createWithBufferGeometry();
    let map = new THREE.TextureLoader().load("./whiteoak.jpg");
    map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping; // texture infinitely repeats in both directions
    map.colorSpace = THREE.SRGBColorSpace; // needed for colored models
    let material = new THREE.MeshPhongMaterial({
      map: map,
      side: THREE.FrontSide,
      specular: 0x3c3c3c,
      shininess: 30,
    });
    let pieces = new THREE.InstancedMesh(geometry, material, 16);
    let tempObj = new THREE.Object3D();
    for (let i = 0; i < 16; i++) {
      let row = Math.floor(i / 4);
      let column = i % 4;
      tempObj.position.set((row - 1.5) * 50, (column - 1.5) * 50, 0);
      tempObj.updateMatrix();
      pieces.setMatrixAt(i, tempObj.matrix);
      pieces.setColorAt(i, new THREE.Color(0xffffff));
    }
    scene.add(pieces);

    geometry.dispose();
    material.dispose();

    animate();

    function animate() {
      requestAnimationFrame(animate);
      control.update();

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(pieces);
      if (intersects.length > 0) {
        let instanceId = intersects[0].instanceId;
        if (highLightInstanceId !== instanceId) {
          pieces.setColorAt(highLightInstanceId, new THREE.Color(0xffffff));
          pieces.setColorAt(instanceId, new THREE.Color(0xe0ffff));
          pieces.instanceColor.needsUpdate = true;
          highLightInstanceId = instanceId;
        }
      } else {
        pieces.setColorAt(highLightInstanceId, new THREE.Color(0xffffff));
        pieces.instanceColor.needsUpdate = true;
        highLightInstanceId = -1;
      }
      renderer.render(scene, camera);
    }
  }

  function createWithExtrudeGeometry() {
    let center = new THREE.Shape();
    center.absarc(0,0,15,0,2*Math.PI);
    let settings = {
      curveSegments: 16,
      step: 1,
      depth: 0,
      bevelThickness: 8,
      bevelSize: 5,
      bevelSegments: 8
    };
    let geometry = new THREE.ExtrudeGeometry(center, settings);
    return geometry;
  }

  function createWithBufferGeometry() {
    const R1 = 15;
    const R2 = 20;
    const H = 16;
    const TOP_SEG = 32;
    const SIDE_SEG = 16;
    const UV_R_MAX = 0.4;
    const TOTAL_SIDE_LENGTH = R1 + 20.56260072;  // calculated the approximate side length with the segments used in the method. Very BAD PRACTICE
    const yToRadius = (y) => {
      let relY = y / (H / 2);  // relative Y
      return R1 + Math.sqrt(1 - relY * relY) * (R2 - R1);  // ellipse
    };
    let geometry = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    let currCos = 1;  // sin of angle of current
    let currSin = 0;
    const stepAngle = 1 / TOP_SEG * 2 * Math.PI;
    const stepY = H / SIDE_SEG;
    for (let i = 0; i < TOP_SEG; i++) {
      let currSideLength = R1;
      let nextSin = Math.sin((i+1) * stepAngle);  // sin of angle with next i
      let nextCos = Math.cos((i+1) * stepAngle);
      vertices.push(
        0, 0, 8,
        R1 * currCos, R1 * currSin, 8,
        R1 * nextCos, R1 * nextSin, 8
      );
      uvs.push(
        0.5, 0.5,
        0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currCos, 0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currSin,
        0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextCos, 0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextSin
      );
      for (let j = 0; j < SIDE_SEG; j++) {
        let currY = 8 - j * stepY;
        let nextY = currY - stepY;
        let currR = yToRadius(currY);
        let nextR = yToRadius(nextY);
        let nextSideLength = currSideLength + Math.sqrt(Math.pow((nextR - currR),2)+stepY*stepY);
        vertices.push(
          currR * nextCos, currR * nextSin, currY,
          currR * currCos, currR * currSin, currY,
          nextR * currCos, nextR * currSin, nextY,

          nextR * currCos, nextR * currSin, nextY,
          nextR * nextCos, nextR * nextSin, nextY,
          currR * nextCos, currR * nextSin, currY
        );
        uvs.push(
          0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextCos, 0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextSin,
          0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currCos, 0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currSin,
          0.5 + nextSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currCos, 0.5 + nextSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currSin,

          0.5 + nextSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currCos, 0.5 + nextSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currSin,
          0.5 + nextSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextCos, 0.5 + nextSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextSin,
          0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextCos, 0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextSin,
        );
        currSideLength = nextSideLength;
      }
      vertices.push(
        0, 0, -8,
        R1 * nextCos, R1 * nextSin, -8,
        R1 * currCos, R1 * currSin, -8
      );
      uvs.push(
        0.5, 0.5,
        0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextCos, 0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * nextSin,
        0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currCos, 0.5 + currSideLength / TOTAL_SIDE_LENGTH * UV_R_MAX * currSin
      );
      currSin = nextSin;
      currCos = nextCos;
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3).onUpload(disposeArray));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2).onUpload(disposeArray));
    geometry.computeVertexNormals();
    return geometry;
  }

  // used for BufferAttribute. Disposes the array property after uploading the buffer to gpu.
  // you cannot dispose the array. It is necessary for raycasting
  function disposeArray() {
    // this.array = null;
  }
})();
