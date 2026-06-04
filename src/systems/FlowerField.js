import * as THREE from "three";
import { SPECIES } from "./FlowerSpecies.js";

const SPECIES_BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));

// Palette variants reused across background flowers for visual variety.
const COLOR_VARIANTS = {
  rose:      [{ petalColor: 0xffc15f, innerColor: 0xffe08a, centerColor: 0xffed8a },
              { petalColor: 0xb06fff, innerColor: 0xd0a0ff, centerColor: 0xe8d0ff },
              { petalColor: 0xff8bd0, innerColor: 0xffd1ee, centerColor: 0xffe6b0 }],
  daisy:     [{ petalColor: 0xffffff, centerColor: 0xffd700 },
              { petalColor: 0xffe0f0, centerColor: 0xff8800 }],
  tulip:     [{ petalColor: 0xff3366 }, { petalColor: 0xff9900 }, { petalColor: 0x9966ff }],
  sunflower: [{}],
  lotus:     [{ petalColor: 0xffccee }, { petalColor: 0xffffff }],
  bluebell:  [{ petalColor: 0x6a7bff }, { petalColor: 0x59c1ff }],
  orchid:    [{ petalColor: 0xd070ff }, { petalColor: 0xff7bb0 }],
};

/**
 * FlowerField — the hero flower plus a meadow of background species.
 * Public API is unchanged: group, flowers, mainFlower, getFlowerPositions(),
 * energize(), update(time).
 */
export class FlowerField {
  constructor({ unlocked = ["rose", "daisy", "tulip", "sunflower"] } = {}) {
    this.group   = new THREE.Group();
    this.flowers = [];
    this._unlocked = new Set(unlocked);
    this._rng = mulberry32(1337); // deterministic layout → no popping between loads

    // ── Central hero flower (always a luminous rose) ──────────────────────────
    const main = SPECIES_BY_ID.rose.build({
      isMain: true,
      stemHeight: 5.5,
      scale: 1.5,
      petalColor: 0xff5fb3,
      innerColor: 0xff8bd0,
      centerColor: 0xffd166,
    });
    main.group.position.set(0, 0, 0);
    main.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.group.add(main.group);
    this.flowers.push(main);
    this.mainFlower = main;

    // ── Background meadow ─────────────────────────────────────────────────────
    this._placeMeadow();

    // ── Ground ────────────────────────────────────────────────────────────────
    const groundGeo = new THREE.CircleGeometry(30, 80);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x274a2c, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // ── Glow ring around the hero flower (bloom-friendly) ────────────────────
    const ringGeo = new THREE.RingGeometry(0.6, 2.2, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff6fb6, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide,
    });
    this.glowRing = new THREE.Mesh(ringGeo, ringMat);
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = 0.02;
    this.group.add(this.glowRing);

    this._buildBurst(main.stemHeight + 0.4);
  }

  /** True if the species id is currently unlocked. */
  isUnlocked(id) { return this._unlocked.has(id); }

  /** Lay out the meadow using only unlocked species. */
  _placeMeadow() {
    const rng = this._rng;
    const pool = SPECIES.filter(s => this._unlocked.has(s.id) && s.id !== "lotus");

    // Lotus flowers near the pond.
    if (this._unlocked.has("lotus")) {
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI + (i - 1.5) * 0.3;
        const dist  = 9.5 + i * 0.5;
        const f = SPECIES_BY_ID.lotus.build({ ...pick(COLOR_VARIANTS.lotus, rng), scale: 0.6 + i * 0.1 });
        f.group.position.set(Math.cos(angle) * dist, 0.02, Math.sin(angle) * dist * 0.6);
        f.group.rotation.y = rng() * Math.PI * 2;
        this._addFlower(f);
      }
    }

    if (pool.length === 0) return;
    for (let i = 0; i < 30; i++) {
      const sp = pool[Math.floor(rng() * pool.length)];
      const variant = pick(COLOR_VARIANTS[sp.id] || [{}], rng);
      const scale = 0.55 + rng() * 0.35;
      const h = 2.4 + rng() * 1.8;
      const f = sp.build({ ...variant, scale, stemHeight: h });

      const angle = rng() * Math.PI * 2;
      const dist  = 3.5 + rng() * 10;
      f.group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist * 0.65);
      f.group.rotation.y = rng() * Math.PI * 2;
      this._addFlower(f);
    }
  }

  _addFlower(f) {
    f.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.group.add(f.group);
    this.flowers.push(f);
  }

  /**
   * Unlock + grow a new species live (used by the shop). Plants a few of the
   * newly-available species so the player sees the change immediately.
   */
  unlockSpecies(id, n = 3) {
    if (this._unlocked.has(id) || !SPECIES_BY_ID[id]) return false;
    this._unlocked.add(id);
    const rng = this._rng;
    for (let i = 0; i < n; i++) {
      const variant = pick(COLOR_VARIANTS[id] || [{}], rng);
      const f = SPECIES_BY_ID[id].build({ ...variant, scale: 0.55 + rng() * 0.35, stemHeight: 2.6 + rng() * 1.6 });
      const angle = rng() * Math.PI * 2;
      const dist  = 4 + rng() * 9;
      f.group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist * 0.65);
      f.group.rotation.y = rng() * Math.PI * 2;
      f.group.scale.setScalar(0.01); // sprout animation
      f._sprout = 0;
      this._addFlower(f);
    }
    return true;
  }

  // ─── Click spark burst ──────────────────────────────────────────────────
  _buildBurst(originY) {
    this._burstCount = 28;
    this._burstOrigin = new THREE.Vector3(0, originY, 0);
    this._burstPos = new Float32Array(this._burstCount * 3);
    this._burstVel = new Float32Array(this._burstCount * 3);
    this._burstLife = 0;

    const colors = new Float32Array(this._burstCount * 3);
    const palette = [new THREE.Color(0xff8bd0), new THREE.Color(0xffd166), new THREE.Color(0x7ef0b5)];
    for (let i = 0; i < this._burstCount; i++) {
      const c = palette[i % palette.length];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this._burstPos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this._burstMat = new THREE.PointsMaterial({
      size: 0.3, vertexColors: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this._burstPoints = new THREE.Points(geo, this._burstMat);
    this._burstPoints.visible = false;
    this.group.add(this._burstPoints);
  }

  /** Returns flat list of all flower world positions (for Bee routing etc.) */
  getFlowerPositions() {
    return this.flowers.map(f => f.group.position.clone());
  }

  /** Burst of energy — scale the main flower briefly + spark burst */
  energize() {
    this._burst = 1.0;
    this._burstLife = 1.0;
    this._burstPoints.visible = true;
    for (let i = 0; i < this._burstCount; i++) {
      this._burstPos[i * 3]     = this._burstOrigin.x;
      this._burstPos[i * 3 + 1] = this._burstOrigin.y;
      this._burstPos[i * 3 + 2] = this._burstOrigin.z;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const sp    = 0.04 + Math.random() * 0.06;
      this._burstVel[i * 3]     = Math.sin(phi) * Math.cos(theta) * sp;
      this._burstVel[i * 3 + 1] = Math.abs(Math.cos(phi)) * sp + 0.02;
      this._burstVel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * sp;
    }
    this._burstPoints.geometry.attributes.position.needsUpdate = true;
  }

  update(time) {
    const t = time * 0.001;

    // Hero flower breathing + burst
    const burst = this._burst || 0;
    const breathe = 1 + Math.sin(t * 1.8) * 0.04 + burst * 0.18;
    this.mainFlower.head.scale.setScalar(breathe);
    this.mainFlower.head.rotation.y = Math.sin(t * 0.6) * 0.12;

    if (burst > 0) {
      const hue = (t * 0.5) % 1;
      this.mainFlower.petalMeshes.forEach(m => m.material.color.setHSL(hue, 0.95, 0.65));
      this._burst = Math.max(0, burst - 0.04);
    }

    this.glowRing.material.opacity = 0.12 + Math.sin(t * 2.4) * 0.07 + burst * 0.22;
    this.glowRing.scale.setScalar(1 + Math.sin(t * 2.4) * 0.05);

    // Background flowers: gentle sway + sprouting animation
    for (let i = 1; i < this.flowers.length; i++) {
      const f = this.flowers[i];
      f.group.rotation.z = Math.sin(t * 0.7 + i * 1.3) * 0.05;
      if (f.head && f.species !== "lotus") f.head.rotation.y = t * (0.2 + (i % 3) * 0.1);
      if (f._sprout !== undefined && f._sprout < 1) {
        f._sprout = Math.min(1, f._sprout + 0.03);
        const e = 1 - Math.pow(1 - f._sprout, 3);
        f.group.scale.setScalar(e);
      }
    }

    // Spark burst animation
    if (this._burstLife > 0) {
      const dec = 0.025;
      for (let i = 0; i < this._burstCount; i++) {
        this._burstPos[i * 3]     += this._burstVel[i * 3];
        this._burstPos[i * 3 + 1] += this._burstVel[i * 3 + 1];
        this._burstPos[i * 3 + 2] += this._burstVel[i * 3 + 2];
        this._burstVel[i * 3 + 1] -= 0.0025;
      }
      this._burstPoints.geometry.attributes.position.needsUpdate = true;
      this._burstMat.opacity = this._burstLife;
      this._burstLife = Math.max(0, this._burstLife - dec);
      if (this._burstLife === 0) this._burstPoints.visible = false;
    }
  }
}

// Small deterministic PRNG so the meadow layout is stable between sessions.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}
