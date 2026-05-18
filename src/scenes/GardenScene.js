import * as THREE from "three";
import { SkyDome }        from "../systems/SkyDome.js";
import { ParticleField }  from "../systems/ParticleField.js";
import { FlowerField }    from "../systems/FlowerField.js";
import { DayNightCycle }  from "../world/DayNightCycle.js";
import { GrassField }     from "../world/GrassField.js";
import { TreeField }      from "../world/TreeField.js";
import { Pond }           from "../world/Pond.js";
import { PetalParticles } from "../world/PetalParticles.js";
import { ButterflyField } from "../entities/Butterfly.js";
import { MushroomField }  from "../entities/Mushroom.js";
import { FireflyField }   from "../entities/Firefly.js";
import { BeeField }       from "../entities/Bee.js";
import { RockField }      from "../entities/Rock.js";

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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Scene ────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0e2a, 25, 90);

    // ── Camera ───────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 5.5, 14);
    this.camera.lookAt(0, 2.5, 0);

    // ── Base Lighting ────────────────────────────────────────────────────────
    this._ambient = new THREE.AmbientLight(0x8090d0, 1.1);
    this.scene.add(this._ambient);

    const fillLight = new THREE.PointLight(0xff8bd0, 1.2, 30);
    fillLight.position.set(-4, 4, 6);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x7ef0b5, 0.8, 24);
    rimLight.position.set(6, 3, -4);
    this.scene.add(rimLight);

    // ── Sky ──────────────────────────────────────────────────────────────────
    this.sky = new SkyDome();
    this.scene.add(this.sky.group);

    // ── Day/Night Cycle ──────────────────────────────────────────────────────
    this.dayNight = new DayNightCycle(this.scene, this._ambient, this.sky, this.scene.fog);

    // ── Core Systems ─────────────────────────────────────────────────────────
    this.particles = new ParticleField(800);
    this.scene.add(this.particles.points);

    this.flowers = new FlowerField();
    this.scene.add(this.flowers.group);

    // ── World Elements ───────────────────────────────────────────────────────
    this.grass  = new GrassField(this.scene, 1600);
    this.trees  = new TreeField(this.scene, 8);
    this.petals = new PetalParticles(this.scene, 100);

    // Pond placed to one side
    this.pond = new Pond(this.scene);
    this.pond.group.position.set(-10, 0, -8);

    // ── Entities ─────────────────────────────────────────────────────────────
    this.mushrooms   = new MushroomField(this.scene, 12);
    this.rocks       = new RockField(this.scene, 14);
    this.butterflies = new ButterflyField(this.scene, 8);

    // Fireflies (visible at night)
    this.fireflies = new FireflyField(this.scene, 18);

    // Bees — route between flower positions
    const flowerPos = this.flowers.getFlowerPositions();
    this.bees = new BeeField(this.scene, flowerPos, 6);

    // ── Raycaster for click interaction ──────────────────────────────────────
    this.raycaster = new THREE.Raycaster();
    this._mouse    = new THREE.Vector2();

    // Subtle camera orbit state
    this._camAngle  = 0;
    this._camTarget = new THREE.Vector3(0, 2.5, 0);
    this._lastTime  = 0;
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

  /** Manually toggle day/night */
  toggleDayNight() {
    this.dayNight.toggleNight();
  }

  /** Current time label for HUD (e.g. "14:30") */
  get timeLabel() {
    return this.dayNight.timeLabel;
  }

  /** Night factor 0–1 */
  get nightFactor() {
    return this.dayNight.nightFactor;
  }

  /** Main render loop update */
  update(time) {
    const delta = time - this._lastTime;
    this._lastTime = time;

    // Day/night (pass raw ms delta so speed is frame-rate independent)
    this.dayNight.update(delta);

    // Update firefly night factor
    this.fireflies.setNightFactor(this.dayNight.nightFactor);

    // Core systems
    this.sky.update(time);
    this.particles.update(time);
    this.flowers.update(time);

    // World
    this.grass.update(time);
    this.trees.update(time);
    this.pond.update(time);
    this.petals.update(time);

    // Entities
    this.mushrooms.update(time);
    this.butterflies.update(time);
    this.fireflies.update(time);
    this.bees.update(time);

    // Slow camera orbit
    this._camAngle += 0.00012;
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
