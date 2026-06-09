import * as THREE from "three";
import { terrainHeight, POND } from "../world/Terrain.js";

/**
 * LadybugField — tiny ladybugs that crawl slowly across the meadow, following
 * the terrain relief. They wander toward nearby targets and re-pick, giving a
 * gentle sense of ground-level life. Small and few, so the cost is negligible.
 */
function buildLadybug() {
  const group = new THREE.Group();

  const R = 0.09;
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xd62828, roughness: 0.35, metalness: 0.15,
    emissive: new THREE.Color(0x5a0a0a), emissiveIntensity: 0.08,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), shellMat);
  group.add(shell);

  const blackMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.5 });

  // Head.
  const head = new THREE.Mesh(new THREE.SphereGeometry(R * 0.5, 10, 8), blackMat);
  head.position.set(0, R * 0.18, R * 0.9);
  head.scale.set(1, 0.7, 0.8);
  group.add(head);

  // Centre seam.
  const seam = new THREE.Mesh(new THREE.BoxGeometry(R * 0.06, R * 0.5, R * 1.7), blackMat);
  seam.position.y = R * 0.5;
  group.add(seam);

  // A few spots.
  const spots = [[0.045, 0.02], [-0.045, 0.02], [0.03, -0.04], [-0.03, -0.04]];
  for (const [sx, sz] of spots) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.22, 8, 6), blackMat);
    spot.position.set(sx, R * 0.7, sz);
    spot.scale.y = 0.4;
    group.add(spot);
  }

  return group;
}

export class LadybugField {
  constructor(scene, count = 7) {
    this.group = new THREE.Group();
    this._bugs = [];
    this._lastTime = 0;

    for (let i = 0; i < count; i++) {
      const g = buildLadybug();
      g.scale.setScalar(0.8 + Math.random() * 0.6);

      // Scatter across the meadow, away from the pond.
      let x = 0, z = 0;
      for (let tries = 0; tries < 8; tries++) {
        const a = Math.random() * Math.PI * 2;
        const d = 2 + Math.random() * 11;
        x = Math.cos(a) * d; z = Math.sin(a) * d;
        if (Math.hypot(x - POND.x, z - POND.z) > POND.radius * 1.2) break;
      }
      g.position.set(x, terrainHeight(x, z) + 0.02, z);
      g.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(g);

      this._bugs.push({
        g, x, z, heading: Math.random() * Math.PI * 2,
        speed: 0.18 + Math.random() * 0.22,
        retarget: Math.random() * 2,
      });
    }

    scene.add(this.group);
  }

  update(time) {
    const t = time * 0.001;
    const dt = this._lastTime ? Math.min(t - this._lastTime, 0.1) : 0;
    this._lastTime = t;

    for (const b of this._bugs) {
      b.retarget -= dt;
      if (b.retarget <= 0) {
        // Gently steer to a new heading, occasionally pausing.
        b.heading += (Math.random() - 0.5) * 1.6;
        b.paused = Math.random() < 0.25;
        b.retarget = 1.2 + Math.random() * 2.5;
      }
      if (!b.paused) {
        const nx = b.x + Math.sin(b.heading) * b.speed * dt;
        const nz = b.z + Math.cos(b.heading) * b.speed * dt;
        // Stay out of the pond and within the meadow.
        if (Math.hypot(nx - POND.x, nz - POND.z) > POND.radius * 1.15 && Math.hypot(nx, nz) < 14) {
          b.x = nx; b.z = nz;
        } else {
          b.heading += Math.PI * 0.7; // turn away from the edge/water
        }
      }
      b.g.position.set(b.x, terrainHeight(b.x, b.z) + 0.02, b.z);
      // Smoothly turn the body toward the heading.
      const cur = b.g.rotation.y;
      let diff = b.heading - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      b.g.rotation.y = cur + diff * 0.1;
    }
  }
}
