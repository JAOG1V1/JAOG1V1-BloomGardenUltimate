import * as THREE from "three";
import { SkyDome }      from "../systems/SkyDome.js";
import { ParticleField } from "../systems/ParticleField.js";
import { FlowerField }  from "../systems/FlowerField.js";

/**
 * GardenScene — owns the Three.js renderer, camera, and all visual systems.
 * Call update(time) every frame and resize(w, h) on canvas resize.
 */
export class GardenScene {
  constructor(canvas) {
    // ── Renderer ────────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // ── Scene ────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0e2a, 20, 80);

    // ── Camera ───────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 5.5, 14);
    this.camera.lookAt(0, 2.5, 0);

    // ── Lighting ─────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x8090d0, 1.1);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff4e8, 1.6);
    sun.position.set(8, 18, 6);
    sun.castShadow = false;
    this.scene.add(sun);

    const fillLight = new THREE.PointLight(0xff8bd0, 1.8, 30);
    fillLight.position.set(-4, 4, 6);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x7ef0b5, 1.2, 24);
    rimLight.position.set(6, 3, -4);
    this.scene.add(rimLight);

    // ── Systems ──────────────────────────────────────────────────────────────
    this.sky     = new SkyDome();
    this.particles = new ParticleField(1000);
    this.flowers = new FlowerField();

    this.scene.add(this.sky.group);
    this.scene.add(this.particles.points);
    this.scene.add(this.flowers.group);

    // ── Raycaster for click interaction ──────────────────────────────────────
    this.raycaster = new THREE.Raycaster();
    this._mouse    = new THREE.Vector2();

    // Subtle camera orbit state
    this._camAngle = 0;
    this._camTarget = new THREE.Vector3(0, 2.5, 0);
  }

  /** Called from Game on pointer events — returns true if flower was hit */
  handlePointer(x, y, w, h) {
    this._mouse.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    this.raycaster.setFromCamera(this._mouse, this.camera);

    // Build clickable meshes list from flower head children
    const targets = [];
    this.flowers.mainFlower.head.traverse(obj => {
      if (obj.isMesh) targets.push(obj);
    });

    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      this.flowers.energize();
      return true;
    }
    return false;
  }

  /** Main render loop update */
  update(time) {
    this.sky.update(time);
    this.particles.update(time);
    this.flowers.update(time);

    // Slow camera orbit
    this._camAngle += 0.00015;
    const r = 14;
    this.camera.position.x = Math.sin(this._camAngle) * r;
    this.camera.position.z = Math.cos(this._camAngle) * r;
    this.camera.lookAt(this._camTarget);

    this.renderer.render(this.scene, this.camera);
  }

  /** Handle window resize */
  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
