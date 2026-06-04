import * as THREE from "three";

/**
 * Terrain — a gently rolling, vertex-coloured ground that replaces the old flat
 * disc. It exposes a pure, cheap `terrainHeight(x, z)` height field so every
 * other system (grass, flowers, mushrooms, rocks, trees, pond) can sit objects
 * exactly on the surface — nothing floats or sinks.
 *
 * The field also carves a real basin where the pond lives, so the water can sit
 * BELOW the surrounding rim instead of reading as a flat disc laid on top.
 */

// ── Pond location & basin shape (shared with Pond.js / GardenScene.js) ────────
export const POND = {
  x: -10,
  z: -8,
  radius: 4.4,   // basin radius (where the rim rises back to ground level)
  depth: 1.05,   // how deep the basin floor sits below the local ground
  waterY: -0.62, // water surface height (world Y) — below the rim, inside the hole
  waterRadius: 4.5, // water disc slightly overshoots so its edge tucks under the bank
};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// Hermite smoothstep between edge0 and edge1 (works either direction).
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Layered sine "hills" — smooth, deterministic and cheap enough to sample on the
// CPU for object placement.
function hills(x, z) {
  return (
    Math.sin(x * 0.18 + 0.5) * Math.cos(z * 0.16) * 0.55 +
    Math.sin(x * 0.07 - z * 0.05) * 0.70 +
    Math.cos(x * 0.33 + z * 0.27) * 0.16 +
    Math.sin(x * 0.55 - z * 0.42) * 0.07
  );
}

/**
 * Ground elevation at world (x, z).
 *  • The central meadow (around the hero flower) is kept nearly flat so the
 *    flower, energy disc and orbiting motes stay perfectly grounded.
 *  • A smooth bowl is subtracted at the pond so the water sits in a real hollow.
 */
export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  // 0 near the centre → 1 out in the meadow: flattens the hero area.
  const centerFlat = smoothstep(2.5, 9.0, r);
  let h = hills(x, z) * centerFlat;

  // Pond basin: a smooth bowl that bottoms out at the centre and returns to the
  // surrounding ground a little past the rim.
  const pr = Math.hypot(x - POND.x, z - POND.z);
  const bowl = smoothstep(POND.radius * 1.08, POND.radius * 0.45, pr); // 1 inside → 0 outside
  h -= POND.depth * bowl;

  return h;
}

/** Surface normal estimated by central differences — for orienting scatter. */
export function terrainNormal(x, z, eps = 0.6) {
  const hL = terrainHeight(x - eps, z);
  const hR = terrainHeight(x + eps, z);
  const hD = terrainHeight(x, z - eps);
  const hU = terrainHeight(x, z + eps);
  return new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
}

export class Terrain {
  /**
   * @param {THREE.Scene} scene
   * @param {boolean} lowQuality — fewer ground-cover instances on mobile
   */
  constructor(scene, lowQuality = false) {
    this.group = new THREE.Group();

    // ── Displaced, vertex-coloured ground mesh ───────────────────────────────
    const SIZE = 90;
    const SEG = lowQuality ? 110 : 170;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2); // into the XZ plane (Y up)

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    // Palette: lush warm green centre → cooler, lighter rim that melts into fog.
    const cGrass = new THREE.Color(0x3f7a3e);
    const cGrass2 = new THREE.Color(0x5a8f45);
    const cMoss = new THREE.Color(0x2f5f33);
    const cDirt = new THREE.Color(0x6e5536);
    const cRim = new THREE.Color(0x6f8f70);
    const tmp = new THREE.Color();

    const maxR = SIZE * 0.5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = terrainHeight(x, z);
      pos.setY(i, y);

      const r = Math.hypot(x, z);
      // Patchy noise drives the blend between grass tones, moss and bare dirt.
      const n1 = Math.sin(x * 0.6 + 1.3) * Math.cos(z * 0.55 - 0.7);
      const n2 = Math.sin(x * 0.23 - z * 0.31);
      const moss = smoothstep(0.25, 0.7, n2);
      const dirt = smoothstep(0.55, 0.95, n1 * 0.6 + n2 * 0.4);

      tmp.copy(cGrass).lerp(cGrass2, (n1 * 0.5 + 0.5));
      tmp.lerp(cMoss, moss * 0.5);
      tmp.lerp(cDirt, dirt * 0.6);

      // Pond shore: muddy/sandy band right around the waterline.
      const pr = Math.hypot(x - POND.x, z - POND.z);
      if (pr < POND.radius * 1.2) {
        const shore = smoothstep(POND.radius * 1.15, POND.radius * 0.7, pr);
        tmp.lerp(cDirt, shore * 0.55);
        if (y < POND.waterY + 0.15) tmp.lerp(new THREE.Color(0x4a5d3a), 0.4);
      }

      // Fade toward the rim so the ground melts into the atmospheric fog.
      const rim = smoothstep(maxR * 0.45, maxR, r);
      tmp.lerp(cRim, rim * 0.7);

      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.97,
      metalness: 0.0,
    });
    // Push the ground slightly back in depth so thin decals (energy disc, water)
    // never z-fight against it.
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = 1;
    mat.polygonOffsetUnits = 1;

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // ── Dense ground cover (clover tufts, pebbles, fallen petals) ────────────
    this._buildGroundCover(lowQuality);

    scene.add(this.group);
  }

  /**
   * Instanced low ground cover so the meadow never reads as bare ground:
   *  • clover / low-leaf tufts (crossed quads, like mini grass clumps)
   *  • scattered pebbles
   *  • fallen petals lying flat on the surface
   * All instanced → cheap even at high counts.
   */
  _buildGroundCover(lowQuality) {
    const cloverCount = lowQuality ? 420 : 900;
    const pebbleCount = lowQuality ? 120 : 240;
    const petalCount = lowQuality ? 90 : 200;

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    // — Clover / low leaf tufts —
    const cloverGeo = makeLeafTuftGeometry();
    const cloverMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.9, side: THREE.DoubleSide,
    });
    const clover = new THREE.InstancedMesh(cloverGeo, cloverMat, cloverCount);
    clover.receiveShadow = true;
    clover.frustumCulled = false;
    for (let i = 0; i < cloverCount; i++) {
      const [x, z] = this._scatterXZ(1.5, 26);
      dummy.position.set(x, terrainHeight(x, z), z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.setScalar(0.5 + Math.random() * 0.7);
      dummy.updateMatrix();
      clover.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.30 - Math.random() * 0.05, 0.5 + Math.random() * 0.2, 0.32 + Math.random() * 0.12);
      clover.setColorAt(i, col);
    }
    clover.instanceMatrix.needsUpdate = true;
    if (clover.instanceColor) clover.instanceColor.needsUpdate = true;
    this.group.add(clover);

    // — Pebbles —
    const pebbleGeo = new THREE.IcosahedronGeometry(0.12, 0);
    const pebbleMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.95, flatShading: true,
    });
    const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
    pebbles.receiveShadow = true;
    pebbles.castShadow = false;
    for (let i = 0; i < pebbleCount; i++) {
      const [x, z] = this._scatterXZ(2, 26);
      dummy.position.set(x, terrainHeight(x, z) + 0.02, z);
      dummy.rotation.set(Math.random(), Math.random() * Math.PI * 2, Math.random());
      const s = 0.5 + Math.random() * 1.1;
      dummy.scale.set(s, s * 0.6, s);
      dummy.updateMatrix();
      pebbles.setMatrixAt(i, dummy.matrix);
      const g = 0.4 + Math.random() * 0.25;
      col.setRGB(g, g - 0.05, g - 0.12);
      pebbles.setColorAt(i, col);
    }
    pebbles.instanceMatrix.needsUpdate = true;
    if (pebbles.instanceColor) pebbles.instanceColor.needsUpdate = true;
    this.group.add(pebbles);

    // — Fallen petals (small flat discs lying on the ground) —
    const petalGeo = new THREE.CircleGeometry(0.12, 6);
    petalGeo.rotateX(-Math.PI / 2);
    const petalMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.6, side: THREE.DoubleSide,
    });
    const petalPalette = [0xff8bd0, 0xffd166, 0xff6fb6, 0xc084fc, 0xfff0f6];
    const petals = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
    petals.receiveShadow = true;
    for (let i = 0; i < petalCount; i++) {
      const [x, z] = this._scatterXZ(1.5, 16);
      dummy.position.set(x, terrainHeight(x, z) + 0.015, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.4);
      dummy.scale.setScalar(0.6 + Math.random() * 0.8);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
      col.set(petalPalette[i % petalPalette.length]);
      petals.setColorAt(i, col);
    }
    petals.instanceMatrix.needsUpdate = true;
    if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
    this.group.add(petals);
  }

  /** Pick an (x,z) on a disc of [minR, maxR], avoiding the pond water. */
  _scatterXZ(minR, maxR) {
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2;
      const d = minR + Math.pow(Math.random(), 0.7) * (maxR - minR);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const pr = Math.hypot(x - POND.x, z - POND.z);
      if (pr > POND.radius * 0.95) return [x, z];
    }
    // Fallback away from the pond.
    return [Math.random() * 6 + 4, Math.random() * 6 + 4];
  }

  update(_time) { /* ground cover is static */ }
}

/**
 * A small crossed-quad leaf tuft (broad, low) used for clover / ground plants.
 * Vertical colour gradient baked into vertex colours (dark base → lighter top).
 */
function makeLeafTuftGeometry() {
  const positions = [];
  const colors = [];
  const indices = [];
  const base = new THREE.Color(0x244e22);
  const top = new THREE.Color(0x6fae4f);
  const c = new THREE.Color();
  const w = 0.14, h = 0.18, segs = 2;

  const addQuad = (rot) => {
    const start = positions.length / 3;
    for (let s = 0; s <= segs; s++) {
      const f = s / segs;
      const y = f * h;
      const ww = w * (1 - f * 0.4);
      const cx = Math.cos(rot), sx = Math.sin(rot);
      for (const sign of [-1, 1]) {
        positions.push(sign * ww * cx, y, sign * ww * sx);
        c.copy(base).lerp(top, f);
        colors.push(c.r, c.g, c.b);
      }
    }
    for (let s = 0; s < segs; s++) {
      const a = start + s * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };
  addQuad(0);
  addQuad(Math.PI / 2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
