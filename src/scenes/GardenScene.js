import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass }     from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass }     from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass }     from "three/examples/jsm/postprocessing/OutputPass.js";
import { OrbitControls }  from "three/examples/jsm/controls/OrbitControls.js";
import { SkyDome }        from "../systems/SkyDome.js";
import { ParticleField }  from "../systems/ParticleField.js";
import { FlowerField }    from "../systems/FlowerField.js";
import { skyEnvEquirectTexture } from "../systems/textures.js";
import { DayNightCycle }  from "../world/DayNightCycle.js";
import { Terrain, POND }   from "../world/Terrain.js";
import { GrassField }     from "../world/GrassField.js";
import { TreeField }      from "../world/TreeField.js";
import { Pond }           from "../world/Pond.js";
import { PetalParticles } from "../world/PetalParticles.js";
import { Weather }        from "../world/Weather.js";
import { ButterflyField } from "../entities/Butterfly.js";
import { DragonflyField } from "../entities/Dragonfly.js";
import { MushroomField }  from "../entities/Mushroom.js";
import { FireflyField }   from "../entities/Firefly.js";
import { BeeField }       from "../entities/Bee.js";
import { RockField }      from "../entities/Rock.js";
import { BirdField }      from "../entities/Bird.js";
import { LadybugField }   from "../entities/Ladybug.js";
import { PowerUpField }    from "../entities/PowerUp.js";

/**
 * GardenScene — owns the Three.js renderer, camera, and all visual systems.
 * Call update(time) every frame and resize(w, h) on canvas resize.
 */
export class GardenScene {
  constructor(canvas, { unlocked, lowQuality = false } = {}) {
    // ── Device quality tier ──────────────────────────────────────────────────
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 760;
    this.isMobile = coarse || smallScreen || lowQuality;
    const q = this.isMobile
      ? { grass: 1100, petals: 40, particles: 170, fireflies: 7, mushrooms: 8, rocks: 8, butterflies: 5, dragonflies: 4, birds: 3, ladybugs: 5, trees: 6, shadows: false }
      : { grass: 2800, petals: 100, particles: 420, fireflies: 12, mushrooms: 12, rocks: 14, butterflies: 8, dragonflies: 6, birds: 4, ladybugs: 7, trees: 8, shadows: true };
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
    // Fog ONLY softens the far horizon: it starts well beyond the playfield so
    // the foreground (flower, trees, creatures) stays crisp, and fades out just
    // around the distant hills so they remain visible instead of being washed
    // into a milky haze. Colour is driven per-frame by DayNightCycle.
    this.scene.fog = new THREE.Fog(0x9fb8e0, 55, 165);

    // ── Environment map (IBL) ────────────────────────────────────────────────
    // A soft sky gradient gives the water its reflection and every PBR material
    // a coherent sheen. Generated once; the scene dials environmentIntensity
    // down at night (see update) so midnight never mirrors a bright daytime sky.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this._envRT = pmrem.fromEquirectangular(skyEnvEquirectTexture());
    this.scene.environment = this._envRT.texture;
    if ("environmentIntensity" in this.scene) this.scene.environmentIntensity = 0.85;
    pmrem.dispose();

    // ── Camera ───────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 220);
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
    // Terrain (rolling, vertex-coloured relief + dense ground cover + pond basin)
    // must be created first so every other system can sit objects on its surface.
    this.terrain = new Terrain(this.scene, this.isMobile);
    this.grass  = new GrassField(this.scene, q.grass);
    this.trees  = new TreeField(this.scene, q.trees);
    this.petals = new PetalParticles(this.scene, q.petals);

    // Pond placed in its carved basin (centre/level shared via POND constants).
    this.pond = new Pond(this.scene);
    this.pond.group.position.set(POND.x, 0, POND.z);

    // ── Entities ─────────────────────────────────────────────────────────────
    this.mushrooms   = new MushroomField(this.scene, q.mushrooms);
    this.rocks       = new RockField(this.scene, q.rocks);
    this.butterflies = new ButterflyField(this.scene, q.butterflies);
    this.dragonflies = new DragonflyField(this.scene, q.dragonflies);
    this.birds       = new BirdField(this.scene, q.birds);
    this.ladybugs    = new LadybugField(this.scene, q.ladybugs);

    // Fireflies (visible at night) — sprite-based, no per-firefly lights
    this.fireflies = new FireflyField(this.scene, q.fireflies);

    // Bees — route between flower positions
    const flowerPos = this.flowers.getFlowerPositions();
    this.bees = new BeeField(this.scene, flowerPos, 6);

    // ── Raycaster for click interaction ──────────────────────────────────────
    this.raycaster = new THREE.Raycaster();
    this._mouse    = new THREE.Vector2();

    // Clickable power-ups that spawn in the world.
    this.powerups = new PowerUpField(this.scene, this.camera);

    // Subtle camera orbit state
    this._camAngle  = 0;
    this._camTarget = new THREE.Vector3(0, 2.5, 0);
    this._lastTime  = 0;

    // ── Orbit controls: drag to look around, wheel/pinch to zoom ──────────────
    // The camera auto-orbits while the player is idle, giving the garden a calm,
    // living feel; the moment the player grabs the camera (drag/zoom) the auto
    // orbit pauses, and it gently resumes a few seconds after they let go.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.06;
    this.controls.enablePan      = false;          // keep focus on the garden
    this.controls.target.copy(this._camTarget);
    this.controls.minDistance    = 6;              // don't clip into the flower
    this.controls.maxDistance    = 26;             // stay within the playfield
    this.controls.minPolarAngle  = 0.25;           // don't look straight down
    this.controls.maxPolarAngle  = Math.PI * 0.49; // don't dip below the ground
    this.controls.rotateSpeed    = 0.5;
    this.controls.zoomSpeed      = 0.8;
    this.controls.autoRotate      = true;
    this.controls.autoRotateSpeed = 0.35;          // slow, dreamy idle orbit
    this.controls.update();

    // Idle tracking: pause the auto orbit during interaction, resume when idle.
    this._idleDelay   = 4.0;  // seconds of stillness before auto orbit resumes
    this._lastInteract = -Infinity;
    this._interacting  = false;
    this.controls.addEventListener("start", () => {
      this._interacting = true;
      this.controls.autoRotate = false;
    });
    this.controls.addEventListener("end", () => {
      this._interacting = false;
      this._lastInteract = this._lastTime;
    });

    // ── Post-processing: bloom for the magical glow ──────────────────────────
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom is kept tight: a HIGH threshold means only genuinely bright/emissive
    // pixels (the energised flower, fireflies, sun/moon glow) bloom, and a modest
    // strength + small radius keep the glow crisp instead of fogging the whole
    // frame into a milky wash.
    const bloomStrength = this.isMobile ? 0.42 : 0.6;
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomStrength, // strength
      0.42,          // radius — tighter halo
      0.9,           // threshold — only bright/emissive areas bloom
    );
    this.composer.addPass(this.bloomPass);

    // Warm, dreamy colour grade: a gentle saturation lift, a warm tint and a
    // soft vignette to pull focus toward the centre. Cheap full-screen shader;
    // toned down on mobile.
    const grade = this.isMobile ? 0.5 : 1.0;
    this.colorGradePass = new ShaderPass({
      uniforms: {
        tDiffuse:   { value: null },
        uSaturation:{ value: 1.0 + 0.12 * grade },
        uWarm:      { value: 0.05 * grade },
        uVignette:  { value: 0.32 * grade },
        uBright:    { value: 1.0 + 0.02 * grade },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform float uSaturation;
        uniform float uWarm;
        uniform float uVignette;
        uniform float uBright;
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          // Saturation around luminance (ITU-R BT.709 luma coefficients).
          float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          c.rgb = mix(vec3(l), c.rgb, uSaturation);
          // Warm tint: lift reds, gently drop blues.
          c.r += uWarm;
          c.b -= uWarm * 0.6;
          c.rgb *= uBright;
          // Vignette.
          vec2 d = vUv - 0.5;
          float vig = smoothstep(0.85, 0.2, dot(d, d) * 2.4);
          c.rgb *= mix(1.0 - uVignette, 1.0, vig);
          gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
        }
      `,
    });
    this.composer.addPass(this.colorGradePass);

    this.composer.addPass(new OutputPass());
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.setSize(window.innerWidth, window.innerHeight);

    // ── Dynamic quality ───────────────────────────────────────────────────────
    // A watchdog measures the framerate and steps quality DOWN (never up, to
    // avoid flapping) if it stays low, protecting weak devices: lower pixel
    // ratio → drop the colour grade → finally dim/disable bloom. The manual
    // "Qualidade reduzida" setting (lowQuality) starts a couple of steps in.
    this._dprCap   = Math.min(window.devicePixelRatio, 2);
    this._bloomBoost = 0;
    this._qLevel   = 0;
    this._qMax     = 3;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._qCooldown = 2500; // ms of warm-up before the first measurement window
    if (lowQuality) this._applyQualityLevel(2);

    // ── Accessibility: respect the OS "reduce motion" preference ──────────────
    // Stop the constant idle camera orbit for users who asked for less motion.
    this._reducedMotion = !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (this._reducedMotion) this.controls.autoRotate = false;

    // ── Wind gusts ────────────────────────────────────────────────────────────
    // Occasional stronger wind that leans the grass and pushes the petals — a
    // gentle eased pulse, then back to calm.
    this._gust = 0;
    this._gusting = false;
    this._gustTimer = 4 + Math.random() * 5;
    this._gustT = 0;
    this._gustDur = 1;
    this._gustPeak = 0;

    // Weather (occasional rain → rainbow). Desktop tier only, and skipped for
    // reduced-motion, so weak devices and motion-sensitive users never see it.
    this.weather = (!this.isMobile && !this._reducedMotion) ? new Weather(this.scene) : null;
  }

  /** Pixel ratio for the current dynamic-quality level. */
  _prForLevel() {
    const caps = [this._dprCap, Math.min(this._dprCap, 1.5), Math.min(this._dprCap, 1.25), 1];
    return caps[this._qLevel] || 1;
  }

  /** Recompute bloom strength from the decor upgrade + current quality level. */
  _recomputeBloom() {
    if (!this.bloomPass) return;
    const base = this.isMobile ? 0.42 : 0.6;
    const dim  = this._qLevel >= 2 ? 0.6 : 1.0; // dim before fully disabling
    this.bloomPass.strength = base * dim + this._bloomBoost * 0.1;
  }

  /** Apply a dynamic-quality level (0 = best … 3 = lightest). */
  _applyQualityLevel(level) {
    this._qLevel = Math.max(0, Math.min(this._qMax, level));
    const pr = this._prForLevel();
    this.renderer.setPixelRatio(pr);
    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    if (this.bloomPass) this.bloomPass.setSize(window.innerWidth, window.innerHeight);
    if (this.colorGradePass) this.colorGradePass.enabled = this._qLevel < 2;
    if (this.bloomPass) this.bloomPass.enabled = this._qLevel < 3;
    this._recomputeBloom();
  }

  /**
   * Called from Game on pointer events. Returns a result describing what was
   * hit: { type: "powerup", kind } | { type: "flower" } | null.
   */
  handlePointer(x, y, w, h) {
    this._mouse.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    this.raycaster.setFromCamera(this._mouse, this.camera);

    // Power-ups take priority (they float in front of the flowers).
    const kind = this.powerups.raycast(this.raycaster);
    if (kind) return { type: "powerup", kind };

    // Build clickable meshes list from flower head children.
    const targets = [];
    this.flowers.mainFlower.head.traverse(obj => {
      if (obj.isMesh) targets.push(obj);
    });
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      // The burst is triggered by Game._energizeFlower so the click and the
      // keyboard (Space/Enter) paths share exactly the same feedback.
      return { type: "flower" };
    }
    return null;
  }

  /** Adjust bloom strength (used by the "Decoração Mágica" upgrade). */
  setBloomBoost(level) {
    this._bloomBoost = level || 0;
    this._recomputeBloom();
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
    // Cap the delta so a backgrounded tab (where requestAnimationFrame pauses)
    // doesn't produce one huge frame that jumps the day/night cycle on return.
    const delta = Math.min(time - this._lastTime, 100);
    this._lastTime = time;

    // Day/night (pass raw ms delta so speed is frame-rate independent)
    this.dayNight.update(delta);

    // Environment reflections + colour grade follow the time of day.
    const night = this.dayNight.nightFactor;
    if ("environmentIntensity" in this.scene) {
      this.scene.environmentIntensity = 0.85 - night * 0.6; // 0.85 day → 0.25 night
    }
    if (this.colorGradePass && this.colorGradePass.enabled) {
      const u = this.colorGradePass.uniforms;
      const g = this.isMobile ? 0.5 : 1.0;
      u.uSaturation.value = 1.0 + (0.12 - night * 0.05) * g;
      u.uWarm.value       = (0.05 - night * 0.11) * g; // warm by day, cool at night
      u.uVignette.value   = (0.32 + night * 0.13) * g;
      u.uBright.value     = 1.0 + (0.02 - night * 0.05) * g;
    }

    // Update firefly night factor
    this.fireflies.setNightFactor(this.dayNight.nightFactor);

    // Power-ups (spawn cooldown, idle motion); fireflies-swarm power-up only
    // appears at night.
    this.powerups.setNightFactor(this.dayNight.nightFactor);
    this.powerups.update(time, delta);

    // Core systems
    this.sky.update(time);
    this.particles.update(time);
    this.flowers.update(time);

    // Wind gusts → grass lean + petal push.
    const wdt = delta / 1000;
    this._gustTimer -= wdt;
    if (!this._gusting && this._gustTimer <= 0) {
      this._gusting = true;
      this._gustT = 0;
      this._gustDur = 1.4 + Math.random() * 1.8;
      this._gustPeak = 0.55 + Math.random() * 0.5;
      this._gustTimer = 7 + Math.random() * 11;
    }
    if (this._gusting) {
      this._gustT += wdt;
      const f = this._gustT / this._gustDur;
      if (f >= 1) { this._gusting = false; this._gust = 0; }
      else this._gust = Math.sin(f * Math.PI) * this._gustPeak;
    }
    this.grass.setGust(this._gust);
    this.petals.setWind(this._gust);

    // Weather (rain → rainbow), desktop tier only.
    if (this.weather) {
      this.weather.setNightFactor(night);
      this.weather.update(time, wdt);
    }

    // World
    this.grass.update(time);
    this.trees.update(time);
    this.pond.update(time);
    this.petals.update(time);

    // Entities
    this.mushrooms.update(time);
    this.butterflies.update(time);
    this.dragonflies.update(time);
    this.birds.update(time);
    this.ladybugs.update(time);
    this.fireflies.update(time);
    this.bees.update(time);

    // Framerate watchdog: if the average frame stays slow, drop one quality
    // level (monotonic — never raises again, to avoid visible flapping).
    this._qCooldown -= delta;
    if (this._qCooldown <= 0 && this._qLevel < this._qMax) {
      this._fpsAccum += delta; // delta is already capped at 100 ms
      if (++this._fpsFrames >= 60) {
        const avgMs = this._fpsAccum / this._fpsFrames;
        if (avgMs > 22) { // sustained < ~45 fps → lighten the load
          this._applyQualityLevel(this._qLevel + 1);
          this._qCooldown = 3000; // let it settle before measuring again
        }
        this._fpsAccum = 0;
        this._fpsFrames = 0;
      }
    }

    // Camera: OrbitControls handles user drag/zoom with damping. When the
    // player has been idle past the threshold, re-enable the gentle auto orbit
    // (unless the user prefers reduced motion).
    if (!this._reducedMotion && !this._interacting && !this.controls.autoRotate &&
        (time - this._lastInteract) > this._idleDelay * 1000) {
      this.controls.autoRotate = true;
    }
    this.controls.update();
    this._camTarget.copy(this.controls.target);

    // Safety net: fade any tree that drifts between the camera and the flower so
    // the hero flower is never obscured during the orbit.
    this.trees.updateFade(this.camera, this._camTarget);

    this.composer.render();
  }

  /** Handle window resize */
  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Re-apply the pixel ratio for the current quality level (keeps any dynamic
    // downshift in effect when moving between displays / rotating the device).
    this._dprCap = Math.min(window.devicePixelRatio, 2);
    const pr = this._prForLevel();
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(w, h);
    }
    if (this.bloomPass) this.bloomPass.setSize(w, h);
  }

  /** Release all GPU resources to avoid leaks when the scene is torn down */
  dispose() {
    if (this.controls && this.controls.dispose) this.controls.dispose();
    if (this.fireflies && this.fireflies.dispose) this.fireflies.dispose();
    if (this.powerups && this.powerups.dispose) this.powerups.dispose();

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

    this.scene.environment = null;
    if (this._envRT) this._envRT.dispose();

    this.scene.clear();
    if (this.composer) this.composer.dispose();
    this.renderer.dispose();
  }
}
