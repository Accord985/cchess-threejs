/**
 * BW 2023.11.13
 * This file draws a Chinese chess piece in animation. If WebGL is not supported,
 *  displays an error message instead.
 *
 * wood picture retrieved from https://kampshardwoods.com/product/white-oak/ &
 *   https://www.pinterest.com/pin/299841287663599961/
 * granite picture from https://en.wikipedia.org/wiki/File:Fj%C3%A6regranitt3.JPG
 * wooden background from https://unsplash.com/photos/brown-parquet-board-wG923J9naFQ?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash
 *
 * // TODO: Documentation!!! Add the mark as I hover.
 * // TODO: add drag mode, clean the code again, combine method used once
 */

'use strict';
import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {PieceFactory} from './piece.js';

(function() {
  window.addEventListener('load', init);

  const FRUSTUM_SIZE = 60;
  const GRID_SIZE = 5;
  const TEXT_COLOR = 0x932011;
  const scene = new THREE.Scene(); // the scene that holds all the objects
  const camera = new THREE.OrthographicCamera(-7,7,7,-7,0.1,100); // responsible for looking at the objects
  const renderer = new THREE.WebGLRenderer(); // renders the result on the page based on scene and camera
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // initiate a 10*9 2D array. Can I do it more efficiently???
  let currentLayout = initiateCurrentLayout();
  let selectedId = null;

  async function init() {
    if (!WebGL.isWebGLAvailable()) {
      addErrorMsg();
      throw new Error('WebGL not supported');
    }
    document.getElementById('loading').classList.remove('hidden');
    const textureLoader = new THREE.TextureLoader();

    scene.background = textureLoader.load('/public/background.jpg');
    setLighting();

    const board = await createBoard(textureLoader);
    board.position.set(0,0,-0.9); // piece height: 1.8
    scene.add(board);

    await defaultLayout();
    // await randomLayout(0.7);

    camera.position.z = 50*Math.cos(Math.PI/9);
    camera.position.y = -50*Math.sin(Math.PI/9);
    camera.lookAt(0,0,0);
    adaptCamera();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(3); // my devicePixelRatio is 1.5. 3 will be ultra HD
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // create more natural shadow
    window.addEventListener('resize', onWindowResize);

    document.getElementById('loading').classList.add('hidden');
    document.body.appendChild(renderer.domElement);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('click', onClick);
    animate();
  }

  function initiateCurrentLayout() {
    let result = new Array(10);
    for (let i = 0; i < 10; i++) {
      result[i] = new Array(9);
      for (let j = 0; j < 9; j++) {
        result[i][j] = null;
      }
    }
    return result;
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

  async function createBoard(textureLoader) {
    const group = new THREE.Group();

    const board = createBoardBase(textureLoader);
    group.add(board);

    const grid = createGrid(textureLoader);
    grid.name = 'grid';
    group.add(grid);

    const text = await createText();
    group.add(text);
    return group;
  }

  function createBoardBase(textureLoader) {
    const group = new THREE.Group();

    const texture = textureLoader.load('/public/whiteoak.jpg'); // TODO: get a new board texture
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.BoxGeometry(48,54.4,4); // chessboard:45*50
    const base = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:0xffffff,map:texture})); // the color is a filter
    base.position.set(0,0.2,-2); // move upward so that the up & bottom margin seem to be the same length
    base.name = "board-base";
    group.add(base);

    const geometry2 = new THREE.PlaneGeometry(48, 54.4);
    const material = new THREE.ShadowMaterial();
    material.transparent = true;
    material.opacity = 0.6;
    const shadow = new THREE.Mesh(geometry2, material);
    shadow.position.set(0, 0.2, 0.1);
    shadow.receiveShadow = true;
    group.add(shadow);

    const geometry3 = new THREE.PlaneGeometry(45, 50);
    const lightTexture = textureLoader.load('/public/board-emission.svg');
    const light = new THREE.Mesh(geometry3, new THREE.MeshBasicMaterial({color: 0xffffff,map: lightTexture, transparent: true}))
    light.position.z = 0.01;
    group.add(light);
    return group;
  }

  function createGrid(textureLoader) {
    const texture = textureLoader.load('/public/board.svg');
    const geometry = new THREE.PlaneGeometry(45,50);
    const pattern = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color: TEXT_COLOR, map: texture, transparent:true}));
    pattern.position.z = 0.02; // 0.01 above the board so that there's no coord conflict issues
    return pattern;
  }

  /**
   * creates all the texts on the board.
   * @returns
   */
  async function createText() {
    const textGroup = new THREE.Group();
    const fontLoader = new FontLoader();
    try {
      const font = await fontLoader.loadAsync('./public/fonts/fz-ht-kai.json');
      const settings = {font:font, size:3,height:0, bevelEnabled:true,bevelThickness:0,bevelSize:0.05};
      const leftText = generateTextAt('楚河', settings, -10, 0);
      const rightText = generateTextAt('汉界', settings, 10, 0);
      textGroup.add(leftText);
      textGroup.add(rightText);
    } catch(err) {
      console.error(err);
    }
    try {
      const font = await fontLoader.loadAsync('./public/fonts/heiti.json');
      const settings = {font:font, size: 1.3, height:0, bevelEnabled: true, bevelThickness:0, bevelSize: 0.05};
      const NUMS = "一二三四五六七八九";
      for (let i = 0; i < 9; i++) {
        const number = generateTextAt(NUMS[8-i], settings, 5*i-20, -25.5);
        textGroup.add(number);
      }
      for (let i = 0; i < 9; i++) {
        const char = generateTextAt(i+1+'', settings, 5*i-20, 26.2);
        textGroup.add(char);
      }
    } catch(err) {
      console.error(err);
    }
    textGroup.position.z = 0.02;
    return textGroup;
  }

  /**
   * creates a mesh with given text, format and position attributes.
   * @param {} content
   * @param {*} setting
   * @param {*} x
   * @param {*} y
   * @returns
   */
  function generateTextAt(content, setting, x, y) {
    const geometry = new TextGeometry(content, setting);
    const material = new THREE.MeshLambertMaterial({color: TEXT_COLOR});
    const text = new THREE.Mesh(geometry,material);
    geometry.computeBoundingBox();
    const offsetX = x - 0.5 * (geometry.boundingBox.max.x + geometry.boundingBox.min.x);
    const offsetY = y - 0.5 * (geometry.boundingBox.max.y + geometry.boundingBox.min.y);
    text.position.set(offsetX, offsetY, 0);
    return text;
  }

  async function defaultLayout() {
    try {
      let resp = await fetch('layouts.json');
      resp = await statusCheck(resp);
      resp = await resp.json();
      await populateByLayout(resp["default"]);
    } catch (err) {
      console.error(err);
    }
  }

  async function populateByLayout(layout) {
    const SCALE = 4.5/40;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        let setting = layout[i][j];
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

  /**
   * cover the whole board with random pieces.
   * @param {float} density - the probability of a piece covering any position. Should be 0.0-1.0
   */
  async function randomLayout(density) {
    const SCALE = 4.5/40;
    const TYPES = "KGENRCP";
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        if (Math.random() < density) {
          let randomTeam = Math.floor(1+2*Math.random());
          let randomType = TYPES.charAt(Math.floor(7*Math.random()));
          PieceFactory.setProperty(randomTeam,randomType);
          let piece = await PieceFactory.createPiece();
          piece.scale.set(SCALE, SCALE, SCALE);
          piece.position.set(5*j-20,5*i-22.5,0);
          currentLayout[i][j] = piece.id;
          scene.add(piece);
        }
      }
    }
  }

  function adaptCamera() {
    let aspect = window.innerWidth / window.innerHeight;
    camera.left = - FRUSTUM_SIZE * aspect / 2;
    camera.right = FRUSTUM_SIZE * aspect / 2;
    camera.top = FRUSTUM_SIZE / 2;
    camera.bottom = - FRUSTUM_SIZE / 2;
    camera.updateProjectionMatrix(); // update the change into the camera
  }

  /**
   * Adapts the renderer and the camera to the window size.
   */
  function onWindowResize() {
    adaptCamera();
    renderer.setSize(window.innerWidth, window.innerHeight); // re-render
  }

  function onPointerMove(evt) {
    pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(evt.clientY / window.innerHeight) * 2 + 1;
  }

  // hovered y, selected y > capture (depending on team)
  // hovered y, selected n > pick up
  // hovered n, selected y > move
  // hovered n, selected n > nothing
  function onClick() {
    let pointerPos = findContactPos();
    let clicked = getPieceInPos(pointerPos);
    const selected = scene.getObjectById(selectedId);
    if (selected) {
      // same: select clicked, put down; different: capture clicked, move, put down; no: move, put down
      unselectPiece(selected);
      if (clicked) {
        if (checkPieceTeam(clicked) !== checkPieceTeam(selected) && checkPieceTeam(clicked) !== 0 && checkPieceTeam(selected) !== 0) {
          clicked.position.x = 40;
          movePieceTo(selected, pointerPos);
        } else {
          selectPiece(clicked);
        }
      } else {
        movePieceTo(selected, pointerPos);
      }
    } else {
      if (clicked) {
        selectPiece(clicked);
      }
    }
  }

  function movePieceTo(piece, boardPos) {
    if (boardPos) {
      let piecePos = toBoardCoord({x:piece.position.x, y:piece.position.y});
      let pointerWorld = toWorldCoord(boardPos);
      piece.position.set(pointerWorld.x,pointerWorld.y,0);
      currentLayout[piecePos.row][piecePos.column] = null;
      currentLayout[boardPos.row][boardPos.column] = piece.id;
    }
  }

  /**
   *
   * @returns {object} an object with x & y attributes as the x & y coordinate on the board. (0,0) represents
   *  the bottom-left corner.
   */
  function findContactPos() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(scene.getObjectByName("grid"));
    if (intersects.length !== 0) {
      let intersect = intersects[0].point; // can't use object because it only sees the components
      return toBoardCoord({x: intersect.x, y: intersect.y});
    }
    return null;
  }

  /**
   * finds out which piece is currently selected.
   * use the board position!!
   * @returns {group} - the piece that is hovered by the cursor
   */
  function getPieceInPos(boardPos) {
    if (boardPos) {
      let piece = scene.getObjectById(currentLayout[boardPos.row][boardPos.column]);
      if (piece) {
        return piece;
      }
    }
    return null;
  }

  function clearHighlight() {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        let piece = getPieceInPos({column:j,row:i});
        if (piece) {
          setHighlight(piece, 0x000000);  // black highlight=no effect
        }
      }
    }
  }

  function selectPiece(piece) {
    piece.rotation.x = - THREE.MathUtils.degToRad(20);
    piece.position.z = 2.4;
    let scale = 4.9 / 40;
    piece.scale.set(scale,scale,scale);
    selectedId = piece.id;
  }

  function unselectPiece(piece) {
    piece.rotation.x = 0;
    piece.position.z = 0;
    let scale = 4.5 / 40;
    piece.scale.set(scale,scale,scale);
    selectedId = null;
  }

  function checkPieceTeam(piece) {
    return parseInt(piece.name.charAt(6));
  }

  function toWorldCoord(boardPos) {
    return {x: 5 * boardPos.column - 20, y: 5 * boardPos.row - 22.5};
  }

  function toBoardCoord(position) {
    let result = {column: Math.floor((position.x + 22.5) / 5), row: Math.floor((position.y + 25) / 5)};
    if (result.column >= 0 && result.column < 9 && result.row >= 0 && result.row < 10) {
      return result;
    }
    return null;
  }

  /**
   * modify the piece for the next frame and renders. This allows the animation of the piece.
   */
  function animate() {
    requestAnimationFrame(animate);


    let position = findContactPos();
    let hovered = getPieceInPos(position);
    clearHighlight();
    if (hovered) {
      setHighlight(hovered, 0x444444);
    }
    renderer.render(scene, camera);
  }

  function setHighlight(piece, color) {
    let components = piece.children;
    for (let i = 0; i < components.length; i++) {
      components[i].material.emissive.setHex(color);
    }
  }

  /**
   * sets up the lighting within the scene.
   */
  function setLighting() {
    const environmentLight = new THREE.AmbientLight(0xcccccc, 3);
    scene.add(environmentLight);
    const light = new THREE.DirectionalLight(0xffffff, 1.6);
    light.position.set(-17,13,40); // direction: from position to (0,0,0) [default]
    light.castShadow = true;
    light.shadow.camera.left = -25; // these allow the light to cast shadow for everything that's within the camera
    light.shadow.camera.right = 25;
    light.shadow.camera.top = 30;
    light.shadow.camera.bottom = -30;
    light.shadow.mapSize.set(256,256);
    scene.add(light);
    const reflectionLight = new THREE.DirectionalLight(0xffffff, 1); // this light creates the reflection on the pieces. casts no shadows
    reflectionLight.position.set(-30,-50,30);
    scene.add(reflectionLight);

    // const helper = new THREE.CameraHelper(reflectionLight.shadow.camera);
    // scene.add(helper);
  }

  /**
   * checks the status of the response from the api. Throws an error if the status is not okay.
   * @param {Object} res - the response from some api
   * @returns {Object} - the same response from that api
   * @throws {Error} the error message in the response
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text()); // res.text is not a function???
    }
    return res;
  }
})();
