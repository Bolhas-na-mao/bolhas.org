import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { ParticleSystem } from './ParticleSystem';
import { PerformanceManager } from '../utils/performance';
import bubbleVertexShader from '../shaders/bubble.vert.glsl';
import bubbleFragmentShader from '../shaders/bubble.frag.glsl';

export class BubbleScene {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer?: EffectComposer;
  private bubble: THREE.Mesh;
  private bubbleMaterial: THREE.ShaderMaterial;
  private particleSystem: ParticleSystem;
  private clock = new THREE.Clock();
  private mouse = new THREE.Vector2();
  private mouseWorld = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private rippleCenter = new THREE.Vector2(0.5, 0.5);
  private rippleStrength = 0;
  private performanceManager = PerformanceManager.getInstance();
  private envTexture: THREE.Texture;
  private excitement = 0;

  private lastMouse = new THREE.Vector2();
  private mouseVelocity = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    const perfConfig = this.performanceManager.getConfig();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setPixelRatio(perfConfig.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.envTexture = this.createEnvironmentTexture();

    this.bubbleMaterial = new THREE.ShaderMaterial({
      vertexShader: bubbleVertexShader,
      fragmentShader: bubbleFragmentShader,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColorPink: { value: new THREE.Color(0xf1a7fe) },
        uColorBlue: { value: new THREE.Color(0xc4efff) },
        uColorExcited: { value: new THREE.Color(0xf1a7fe) },
        uCameraPosition: { value: this.camera.position },
        uWaveIntensity: { value: 0.2 },
        uIridescence: { value: 0.4 },
        uRefractiveIndex: { value: 0.4 },
        uRippleCenter: { value: this.rippleCenter },
        uRippleStrength: { value: 0 },
        uEnvMap: { value: this.envTexture },
        uExcitement: { value: 0 },
      },
    });

    const bubbleGeometry = new THREE.SphereGeometry(1, 64, 64);
    this.bubble = new THREE.Mesh(bubbleGeometry, this.bubbleMaterial);
    this.scene.add(this.bubble);

    this.particleSystem = new ParticleSystem(perfConfig.particleCount, 1);
    this.scene.add(this.particleSystem.getMesh());

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0xc4efff, 0.9);
    topLight.position.set(2, 3, 2);
    this.scene.add(topLight);

    const sideLight = new THREE.DirectionalLight(0xf1a7fe, 0.6);
    sideLight.position.set(-2, 1, -1);
    this.scene.add(sideLight);

    if (perfConfig.enablePostProcessing) {
      this.setupPostProcessing();
    }

    this.setupEventListeners();
  }

  private createEnvironmentTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#F1A7FE');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, '#C4EFFF');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,
      0.1,
      0.85
    );
    this.composer.addPass(bloomPass);

    const fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    fxaaPass.material.uniforms['resolution'].value.x =
      1 / (window.innerWidth * pixelRatio);
    fxaaPass.material.uniforms['resolution'].value.y =
      1 / (window.innerHeight * pixelRatio);
    this.composer.addPass(fxaaPass);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.canvas.addEventListener('click', () => this.onInteract());
    this.canvas.addEventListener('touchstart', () => this.onInteract());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onInteract();
      } else if (e.key === 'ArrowLeft') {
        this.bubble.rotation.y += 0.1;
      } else if (e.key === 'ArrowRight') {
        this.bubble.rotation.y -= 0.1;
      } else if (e.key === 'ArrowUp') {
        this.bubble.rotation.x += 0.1;
      } else if (e.key === 'ArrowDown') {
        this.bubble.rotation.x -= 0.1;
      }
    });
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    if (this.composer) {
      this.composer.setSize(width, height);

      const pixelRatio = this.renderer.getPixelRatio();
      const fxaaPass = this.composer.passes.find(
        (pass): pass is ShaderPass =>
          pass instanceof ShaderPass &&
          'material' in pass &&
          'uniforms' in pass.material &&
          'resolution' in pass.material.uniforms
      );

      if (fxaaPass) {
        fxaaPass.material.uniforms['resolution'].value.x =
          1 / (width * pixelRatio);
        fxaaPass.material.uniforms['resolution'].value.y =
          1 / (height * pixelRatio);
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.bubble);

    if (intersects.length > 0) {
      const uv = intersects[0].uv;
      if (uv) {
        this.rippleCenter.copy(uv);
      }
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
  }

  private onInteract(): void {
    this.rippleStrength = 1.0;
    this.particleSystem.disperse();
    this.excitement = 1.0;
  }

  update(): void {
    const time = this.clock.getElapsedTime();
    this.bubbleMaterial.uniforms.uTime.value = time;

    this.mouseVelocity.subVectors(this.mouse, this.lastMouse);
    const speed = this.mouseVelocity.length();

    const targetExcitement = Math.min(speed * 40, 1.0);

    this.excitement += (targetExcitement - this.excitement) * 0.1;

    this.lastMouse.copy(this.mouse);

    this.bubbleMaterial.uniforms.uExcitement.value = this.excitement;

    const heartbeat = Math.sin(time * 6.0) * 0.01 + 1.0;
    this.bubble.scale.set(heartbeat, heartbeat, heartbeat);

    this.mouseWorld.set(this.mouse.x, this.mouse.y, 0.5);
    this.mouseWorld.unproject(this.camera);
    const direction = this.mouseWorld.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / direction.z;
    const pos = this.camera.position
      .clone()
      .add(direction.multiplyScalar(distance));

    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(this.bubble.position, pos, this.bubble.up)
    );
    this.bubble.quaternion.slerp(targetQuaternion, 0.1);

    if (this.rippleStrength > 0) {
      this.rippleStrength *= 0.95;
      if (this.rippleStrength < 0.01) this.rippleStrength = 0;
    }
    this.bubbleMaterial.uniforms.uRippleStrength.value = this.rippleStrength;

    this.particleSystem.update(time, pos, this.excitement);

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose(): void {
    this.renderer.dispose();
    this.bubbleMaterial.dispose();
    this.envTexture.dispose();
  }
}
