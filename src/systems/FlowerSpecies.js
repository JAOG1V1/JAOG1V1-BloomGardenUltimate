import * as THREE from "three";

/**
 * FlowerSpecies — builders for true 3D, low-poly stylised flowers.
 *
 * The previous version drew each petal as a single flat THREE.ShapeGeometry
 * rotated only around the Z axis, so every petal lived in the SAME plane and
 * the flower looked like a cardboard cut-out from the side. Here every petal is
 * a pair of CROSSED planes (a "+" cross-section) arranged RADIALLY around the
 * vertical axis and tilted outward, giving real volume from any camera angle.
 */

// ─── Shared petal shape → geometry cache ────────────────────────────────────
const _petalGeoCache = new Map();

/** A teardrop petal shape in the XY plane, base at origin, tip toward +Y. */
function petalShape(width, length, belly = 0.5) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-width, length * belly, -width * 0.55, length * 0.9, 0, length);
  s.bezierCurveTo(width * 0.55, length * 0.9, width, length * belly, 0, 0);
  return s;
}

function petalGeometry(key, width, length, belly) {
  if (_petalGeoCache.has(key)) return _petalGeoCache.get(key);
  const geo = new THREE.ShapeGeometry(petalShape(width, length, belly), 14);
  geo.computeVertexNormals();
  _petalGeoCache.set(key, geo);
  return geo;
}

/**
 * A single petal built from two crossed planes so it reads as a 3D form from
 * every direction instead of a flat card.
 */
function crossedPetal(geo, mat) {
  const g = new THREE.Group();
  const a = new THREE.Mesh(geo, mat);
  const b = new THREE.Mesh(geo, mat);
  b.rotation.y = Math.PI / 2; // perpendicular plane → volume along the petal length
  b.scale.setScalar(0.85);
  g.add(a, b);
  return g;
}

function petalMaterial(color, { emissive = 0, rough = 0.55 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0.0,
    flatShading: false,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(color),
    emissiveIntensity: emissive,
  });
}

function stem(height, rTop, rBot, color = 0x2f9a52) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, height, 7);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = height / 2;
  m.castShadow = true;
  return m;
}

/** A 3D leaf: two crossed angled blades rooted on the stem (no floating card). */
function leafCluster(scale, height, color = 0x2c8e4a) {
  const g = new THREE.Group();
  const geo = petalGeometry(`leaf${scale.toFixed(2)}`, 0.18 * scale, 0.9 * scale, 0.7);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
  for (let i = 0; i < 2; i++) {
    const leaf = crossedPetal(geo, mat);
    leaf.rotation.x = 1.15;            // lay it almost flat, arcing up
    const pivot = new THREE.Group();
    pivot.add(leaf);
    pivot.rotation.y = i * Math.PI + 0.4;
    pivot.position.y = height * (0.32 + i * 0.12);
    g.add(pivot);
  }
  return g;
}

/** Low-poly dome centre (stamen) — real geometry, not a flat disk. */
function centerDome(radius, color, emissive = 0.35) {
  const geo = new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    emissive: new THREE.Color(color),
    emissiveIntensity: emissive,
    flatShading: true,
  });
  const m = new THREE.Mesh(geo, mat);
  return m;
}

/**
 * Generic radial flower head: `rings` describes concentric petal rings.
 * Each ring: { count, color, width, length, tilt, y, scale, belly }.
 */
function radialHead(rings, { center = null } = {}) {
  const head = new THREE.Group();
  const petalMeshes = [];

  rings.forEach((ring, ri) => {
    const geo = petalGeometry(
      `r${ri}-${ring.width.toFixed(2)}-${ring.length.toFixed(2)}-${(ring.belly || 0.5).toFixed(2)}`,
      ring.width, ring.length, ring.belly || 0.5,
    );
    const mat = petalMaterial(ring.color, { emissive: ring.emissive || 0.05 });
    for (let i = 0; i < ring.count; i++) {
      const petal = crossedPetal(geo, mat);
      petal.rotation.x = ring.tilt; // lean outward from vertical
      const pivot = new THREE.Group();
      pivot.add(petal);
      pivot.rotation.y = (i / ring.count) * Math.PI * 2 + (ring.offset || 0);
      pivot.position.y = ring.y || 0;
      head.add(pivot);
      petalMeshes.push(petal.children[0], petal.children[1]);
    }
  });

  if (center) {
    center.position.y = (rings[0] && rings[0].y) || 0;
    head.add(center);
  }

  return { head, petalMeshes, center };
}

// ─── Species builders ────────────────────────────────────────────────────────

function buildRose({ scale = 1, petalColor = 0xff5fb3, innerColor = 0xff8bd0, centerColor = 0xffd166, stemHeight = 3.2, isMain = false } = {}) {
  const group = new THREE.Group();
  group.add(stem(stemHeight, 0.05 * scale, 0.08 * scale));
  group.add(leafCluster(scale, stemHeight));

  const rings = [
    { count: 8,  color: petalColor, width: 0.34 * scale, length: 1.15 * scale, tilt: 0.95, y: 0, belly: 0.55 },
    { count: 8,  color: innerColor, width: 0.28 * scale, length: 0.85 * scale, tilt: 0.65, y: 0.08 * scale, offset: Math.PI / 8, belly: 0.5 },
  ];
  if (isMain) {
    rings.push({ count: 6, color: innerColor, width: 0.22 * scale, length: 0.55 * scale, tilt: 0.35, y: 0.16 * scale, offset: Math.PI / 6, emissive: 0.15 });
  }
  const center = centerDome(0.2 * scale, centerColor, isMain ? 0.5 : 0.3);
  const { head, petalMeshes } = radialHead(rings, { center });
  head.position.y = stemHeight;
  group.add(head);

  return { group, head, petalMeshes, center, stemHeight, species: "rose" };
}

function buildDaisy({ scale = 1, petalColor = 0xffffff, centerColor = 0xffd700, stemHeight = 2.8 } = {}) {
  const group = new THREE.Group();
  group.add(stem(stemHeight, 0.04 * scale, 0.06 * scale, 0x3aa552));
  group.add(leafCluster(scale * 0.8, stemHeight));

  const rings = [
    { count: 16, color: petalColor, width: 0.1 * scale, length: 0.95 * scale, tilt: 1.15, y: 0, belly: 0.35 },
  ];
  const center = centerDome(0.17 * scale, centerColor, 0.4);
  const { head, petalMeshes } = radialHead(rings, { center });
  head.position.y = stemHeight;
  group.add(head);

  return { group, head, petalMeshes, center, stemHeight, species: "daisy" };
}

function buildTulip({ scale = 1, petalColor = 0xff3366, stemHeight = 3.5 } = {}) {
  const group = new THREE.Group();
  group.add(stem(stemHeight, 0.055 * scale, 0.08 * scale));
  group.add(leafCluster(scale, stemHeight, 0x2c8e4a));

  const rings = [
    { count: 6, color: petalColor, width: 0.32 * scale, length: 1.05 * scale, tilt: 0.28, y: 0, belly: 0.7 },
    { count: 3, color: petalColor, width: 0.3 * scale, length: 0.95 * scale, tilt: 0.18, y: 0.05 * scale, offset: Math.PI / 6, belly: 0.7 },
  ];
  const { head, petalMeshes } = radialHead(rings, {});
  head.position.y = stemHeight;
  group.add(head);

  return { group, head, petalMeshes, center: null, stemHeight, species: "tulip" };
}

function buildSunflower({ scale = 1, stemHeight = 4.5 } = {}) {
  const group = new THREE.Group();
  group.add(stem(stemHeight, 0.08 * scale, 0.12 * scale, 0x4a9a3a));
  group.add(leafCluster(scale * 1.1, stemHeight, 0x3c8a2f));

  const rings = [
    { count: 20, color: 0xffc400, width: 0.13 * scale, length: 1.1 * scale, tilt: 1.0, y: 0, belly: 0.4 },
    { count: 16, color: 0xffd23f, width: 0.12 * scale, length: 0.85 * scale, tilt: 1.1, y: 0.04 * scale, offset: Math.PI / 16, belly: 0.4 },
  ];
  const center = centerDome(0.36 * scale, 0x5a2d00, 0.1);
  const { head, petalMeshes } = radialHead(rings, { center });
  head.position.y = stemHeight;
  group.add(head);

  return { group, head, petalMeshes, center, stemHeight, species: "sunflower" };
}

function buildLotus({ scale = 1, petalColor = 0xffccee, centerColor = 0xffee88 } = {}) {
  const group = new THREE.Group();

  // Floating pad (kept low so it never reads as a floating card)
  const padGeo = new THREE.CircleGeometry(1.0 * scale, 18);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  pad.receiveShadow = true;
  group.add(pad);

  const rings = [
    { count: 10, color: petalColor, width: 0.26 * scale, length: 0.8 * scale, tilt: 1.0, y: 0.1 * scale, belly: 0.6 },
    { count: 8,  color: new THREE.Color(petalColor).offsetHSL(0, 0.1, 0.08).getHex(), width: 0.22 * scale, length: 0.6 * scale, tilt: 0.6, y: 0.18 * scale, offset: Math.PI / 8, belly: 0.6 },
  ];
  const center = centerDome(0.16 * scale, centerColor, 0.5);
  const { head, petalMeshes } = radialHead(rings, { center });
  head.position.y = 0.08 * scale;
  group.add(head);

  return { group, head, petalMeshes, center, stemHeight: 0, species: "lotus" };
}

/** Bluebell — a cluster of small bell flowers on a tall stem (new species). */
function buildBluebell({ scale = 1, petalColor = 0x6a7bff, stemHeight = 3.0 } = {}) {
  const group = new THREE.Group();
  group.add(stem(stemHeight, 0.04 * scale, 0.06 * scale, 0x3a8a4a));
  group.add(leafCluster(scale * 0.7, stemHeight));

  const head = new THREE.Group();
  head.position.y = stemHeight;
  const petalMeshes = [];
  const bellGeo = new THREE.ConeGeometry(0.18 * scale, 0.34 * scale, 6, 1, true);
  const bellMat = petalMaterial(petalColor, { emissive: 0.12 });
  for (let i = 0; i < 5; i++) {
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.rotation.x = Math.PI; // mouth facing down
    const a = (i / 5) * Math.PI * 2;
    bell.position.set(Math.cos(a) * 0.22 * scale, -i * 0.16 * scale, Math.sin(a) * 0.22 * scale);
    head.add(bell);
    petalMeshes.push(bell);
  }
  group.add(head);
  return { group, head, petalMeshes, center: null, stemHeight, species: "bluebell" };
}

/** Orchid — wide flared petals with a contrasting lip (new species). */
function buildOrchid({ scale = 1, petalColor = 0xd070ff, lipColor = 0xffe66d, stemHeight = 3.4 } = {}) {
  const group = new THREE.Group();
  group.add(stem(stemHeight, 0.045 * scale, 0.07 * scale, 0x3a8a4a));
  group.add(leafCluster(scale, stemHeight));

  const rings = [
    { count: 5, color: petalColor, width: 0.4 * scale, length: 0.95 * scale, tilt: 1.25, y: 0, belly: 0.45 },
  ];
  const center = centerDome(0.16 * scale, lipColor, 0.45);
  const { head, petalMeshes } = radialHead(rings, { center });
  head.position.y = stemHeight;
  group.add(head);

  return { group, head, petalMeshes, center, stemHeight, species: "orchid" };
}

// ─── Species registry (the 7 unlockable species) ────────────────────────────
export const SPECIES = [
  { id: "rose",      name: "Rosa",     emoji: "🌹", build: buildRose },
  { id: "daisy",     name: "Margarida", emoji: "🌼", build: buildDaisy },
  { id: "tulip",     name: "Tulipa",   emoji: "🌷", build: buildTulip },
  { id: "sunflower", name: "Girassol", emoji: "🌻", build: buildSunflower },
  { id: "lotus",     name: "Lótus",    emoji: "🪷", build: buildLotus },
  { id: "bluebell",  name: "Campânula", emoji: "🔔", build: buildBluebell },
  { id: "orchid",    name: "Orquídea", emoji: "🌸", build: buildOrchid },
];

export {
  buildRose, buildDaisy, buildTulip, buildSunflower,
  buildLotus, buildBluebell, buildOrchid,
};
