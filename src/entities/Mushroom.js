import * as THREE from "three";
import { terrainHeight, POND } from "../world/Terrain.js";

const MUSHROOM_PALETTES = [
  { cap: 0xff4444, spots: 0xffffff, stem: 0xf5deb3 },
  { cap: 0x9b59b6, spots: 0xf8c8ff, stem: 0xe8d5f0 },
  { cap: 0x2ecc71, spots: 0xd5f5e3, stem: 0xd0f0d8 },
  { cap: 0xe67e22, spots: 0xfdebd0, stem: 0xfef9e7 },
  { cap: 0x3498db, spots: 0xd6eaf8, stem: 0xebf5fb },
];

function buildMushroom(palette, scale = 1) {
  const group = new THREE.Group();

  // Stem
  const stemH = (0.5 + Math.random() * 0.5) * scale;
  const stemGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, stemH, 12);
  const stemMat = new THREE.MeshStandardMaterial({
    color: palette.stem,
    roughness: 0.8,
    emissive: new THREE.Color(palette.stem),
    emissiveIntensity: 0.05,
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = stemH / 2;
  group.add(stem);

  // Cap
  const capR = (0.28 + Math.random() * 0.18) * scale;
  const capGeo = new THREE.SphereGeometry(capR, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const capMat = new THREE.MeshStandardMaterial({
    color: palette.cap,
    roughness: 0.4,
    emissive: new THREE.Color(palette.cap),
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = stemH + capR * 0.15;
  group.add(cap);

  // Spots on cap (decorative dots)
  const spotMat = new THREE.MeshStandardMaterial({
    color: palette.spots,
    roughness: 0.5,
    emissive: new THREE.Color(palette.spots),
    emissiveIntensity: 0.2,
  });
  for (let i = 0; i < 5; i++) {
    const sGeo = new THREE.CircleGeometry(0.04 * scale, 8);
    const spot = new THREE.Mesh(sGeo, spotMat);
    const phi = Math.random() * Math.PI * 0.5;
    const theta = Math.random() * Math.PI * 2;
    spot.position.set(
      Math.sin(phi) * Math.cos(theta) * capR,
      stemH + capR * 0.15 + Math.cos(phi) * capR * 0.95,
      Math.sin(phi) * Math.sin(theta) * capR,
    );
    spot.lookAt(spot.position.clone().multiplyScalar(2).sub(new THREE.Vector3(0, stemH + capR * 0.15, 0)));
    group.add(spot);
  }

  // Soft glow is faked purely with the cap's emissive material (no PointLight —
  // many dynamic lights wreck WebGL performance).
  return { group, capMat, stemMat };
}

export class MushroomField {
  constructor(scene, count = 12) {
    this.group = new THREE.Group();
    this._mushrooms = [];

    for (let i = 0; i < count; i++) {
      const palette = MUSHROOM_PALETTES[i % MUSHROOM_PALETTES.length];
      const scale = 0.5 + Math.random() * 0.7;
      const m = buildMushroom(palette, scale);

      let x = 0, z = 0;
      for (let tries = 0; tries < 6; tries++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = 3 + Math.random() * 11;
        x = Math.cos(angle) * dist;
        z = Math.sin(angle) * dist;
        if (Math.hypot(x - POND.x, z - POND.z) > POND.radius * 1.1) break;
      }
      m.group.position.set(x, terrainHeight(x, z), z);
      m.group.rotation.y = Math.random() * Math.PI * 2;

      this.group.add(m.group);
      this._mushrooms.push({ ...m, phase: Math.random() * Math.PI * 2 });
    }

    scene.add(this.group);
  }

  update(time) {
    const t = time * 0.001;
    for (const m of this._mushrooms) {
      const pulse = 0.28 + Math.sin(t * 1.5 + m.phase) * 0.12;
      m.capMat.emissiveIntensity = pulse;
    }
  }
}
