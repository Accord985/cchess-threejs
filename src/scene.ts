import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module';

export default class ThreeCChess {
  private domElement: HTMLElement;
  private initialized: boolean;
  private renderer: THREE.WebGLRenderer;
  private pointer: THREE.Vector2;
  private cube: THREE.Mesh;

  public getDom() { return this.domElement; }
  public setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  constructor() {
    this.domElement = document.createElement('canvas');
    this.initialized = false;
    this.pointer = new THREE.Vector2();
    this.renderer = new THREE.WebGLRenderer();
    this.cube = new THREE.Mesh();
  }

  public setup() {
    if (this.initialized) {return;}
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    const stats: Stats = new Stats(); // the stats modules for FPS, lag, and memory usage

    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const cube = new THREE.Mesh( geometry, material );
    scene.add( cube );
    this.cube = cube;

    camera.position.z = 5;
    this.domElement = this.renderer.domElement;
    this.renderer.setAnimationLoop(() => {this.animate(cube, scene, camera, stats)});
  }

  public updateColor(color: number) {
    let original = this.cube.material;
    this.cube.material = new THREE.MeshBasicMaterial({color: color});
    // if (Array.isArray(original)) {
    //   original.forEach(m => m.dispose());
    // } else {
    //   original.dispose();
    // }
  }

  private animate(cube: THREE.Mesh, scene: THREE.Scene, camera: THREE.Camera, stats: Stats) {
    let scale = 2 + Math.sin(0.001*Date.now())
    cube.scale.set(scale, scale, scale);
    cube.rotation.x = this.pointer.x;
    cube.rotation.y = this.pointer.y;
    this.renderer.render( scene, camera );
    stats.update();
  }
}