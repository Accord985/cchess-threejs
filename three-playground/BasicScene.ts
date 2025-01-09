import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const VIEW_WIDTH = 450;
const VIEW_HEIGHT = 500;
const aspect = VIEW_WIDTH / VIEW_HEIGHT;
const frustumSize = 500;

class BasicScene {
  public scene: THREE.Scene;
  public camera: THREE.Camera;
  public renderer: THREE.WebGLRenderer;
  public control: OrbitControls | null;
  public domElement: HTMLCanvasElement;
  public raycaster: THREE.Raycaster | null;
  private mouse: THREE.Vector2;

  constructor(options: {hasControls?: boolean, hasRaycaster?: boolean}) {
    // basic setup: camera, scene, renderer, and control
    this.camera = new THREE.OrthographicCamera(frustumSize*aspect/-2,frustumSize*aspect/2,frustumSize/2,frustumSize/-2,0.1,2000);
    this.camera.position.set(0,-200,250);
    this.camera.lookAt(0,0,0);
    // this.camera = new THREE.PerspectiveCamera();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcfbc46);
    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(450, 500);
    this.domElement = this.renderer.domElement;
    this.control = options.hasControls ? new OrbitControls(this.camera, this.domElement) : null;
    if (options.hasControls) {
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2(1, 1);
      this.domElement.addEventListener('mousemove', (event) => {
        event.preventDefault();
        // normalize to [-1,1]
        this.mouse.x = (event.offsetX / VIEW_WIDTH) * 2 - 1;  // offsetX: the x coord within the element
        this.mouse.y = - (event.offsetY / VIEW_HEIGHT) * 2 + 1;
      });
    } else {
      this.raycaster = null;
      this.mouse = new THREE.Vector2(NaN, NaN);
    }

    // lighting
    let light = new THREE.DirectionalLight(0xffffff, 4);  // dark-mode: 2
    light.position.set(0,-8,16);
    this.scene.add(light);
    // let helper = new THREE.DirectionalLightHelper(light);
    // scene.add(helper);
    let ambient = new THREE.AmbientLight(0xbbbbbb, 2);
    this.scene.add(ambient);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  updateRaycaster() {
    this.raycaster?.setFromCamera(this.mouse, this.camera);
  }
}

export {BasicScene};