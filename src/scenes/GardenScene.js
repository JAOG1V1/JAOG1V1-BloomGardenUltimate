import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass }     from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass }     from "three/examples/jsm/postprocessing/OutputPass.js";
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
  constructor(canvas, { unlocked } = {}) {
    // ── Device quality tier ──────────────────────────────────────────────────
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 760;
    this.isMobile = coarse || smallScreen;
    const q = this.isMobile
      ? { grass: 1100, petals: 40, particles: 300, fireflies: 10, mushrooms: 8, rocks: 8, butterflies: 5, trees: 6, shadows: false }
      : { grass: 2800, petals: 100, particles: 800, fireflies: 18, mushrooms: 12, rocks: 14, butterflies: 8, trees: 8, shadows: true };
    this._q = q;

    // ── Renderer ────────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isMobile,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Scene ────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0e2a, 25, 90);

    // ── Camera ───────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 5.5, 14);
    this.camera.lookAt(0, 2.5, 0);

    // ── Base Lighting ────────────────────────────────────────────────────────
    // Ambient is kept low and driven by the day/night cycle; a HemisphereLight
    // (sky tint above, ground bounce below) gives the low-poly look its soft,
    // coherent shading.
    this._ambient = new THREE.AmbientLight(0x8090d0, 0.45);
    this.scene.add(this._ambient);

    this._hemi = new THREE.HemisphereLight(0xbcd6ff, 0x33502f, 0.9);
    this._hemi.position.set(0, 30, 0);
    this.scene.add(this._hemi);

    // ── Sky ──────────────────────────────────────────────────────────────────
    this.sky = new SkyDome();
    this.scene.add(this.sky.group);

    // ── Day/Night Cycle ──────────────────────────────────────────────────────
    this.dayNight = new DayNightCycle(this.scene, this._ambient, this.sky, this.scene.fog);
    if (!q.shadows) this.dayNight.sunLight.castShadow = false;

    // ── Core Systems ─────────────────────────────────────────────────────────
    this.particles = new ParticleField(q.particles);
    this.scene.add(this.particles.points);

    this.flowers = new FlowerField({ unlocked });
    this.scene.add(this.flowers.group);

    // ── World Elements ───────────────────────────────────────────────────────
    this.grass  = new GrassField(this.scene, q.grass);
    this.trees  = new TreeField(this.scene, q.trees);
    this.petals = new PetalParticles(this.scene, q.petals);

    // Pond placed to one side
    this.pond = new Pond(this.scene);
    this.pond.group.position.set(-10, 0, -8);

    // ── Entities ─────────────────────────────────────────────────────────────
    this.mushrooms   = new MushroomField(this.scene, q.mushrooms);
    this.rocks       = new RockField(this.scene, q.rocks);
    this.butterflies = new ButterflyField(this.scene, q.butterflies);

    // Fireflies (visible at night) — sprite-based, no per-firefly lights
    this.fireflies = new FireflyField(this.scene, q.fireflies);

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

    // ── Post-processing: bloom for the magical glow ──────────────────────────
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomStrength = this.isMobile ? 0.55 : 0.85;
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength, // strength
      0.6,           // radius
      0.85,          // threshold — only bright/emissive areas bloom
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);
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

  /** Trigger the hero-flower energy burst (clicks / level-ups) */
  energize() {
    this.flowers.energize();
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

    this.composer.render();
  }

  /** Handle window resize */
  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Re-apply pixel ratio so moving between displays (different DPR) stays crisp.
    const pr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(w, h);
    }
  }

  /** Release all GPU resources to avoid leaks when the scene is torn down */
  dispose() {
    if (this.fireflies && this.fireflies.dispose) this.fireflies.dispose();

    // Dispose every geometry/material/texture still in the graph.
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : (obj.material ? [obj.material] : []);
      for (const mat of mats) {
        for (const key of Object.keys(mat)) {
          const val = mat[key];
          if (val && val.isTexture) val.dispose();
        }
        mat.dispose();
      }
    });

    this.scene.clear();
    if (this.composer) this.composer.dispose();
    this.renderer.dispose();
  }
}
