import * as THREE from "three";
import { POND } from "../world/Terrain.js";

/**
 * DragonflyField — slender, iridescent dragonflies that hover and dart over the
 * pond and meadow. Unlike the butterflies' lazy figure-8s, these flit in quick
 * straight bursts toward new targets, then pause — the way real dragonflies move.
 * Wings are near-horizontal and translucent, picking up the scene environment
 * map for a subtle shimmer. Counts are driven by GardenScene's quality tier.
 */

const BODY_COLORS = [0x3fd6c0, 0x4aa3ff, 0x6fe06a, 0x40c0d0, 0x9b6fff];

function buildDragonfly(color) {
  const group = new THREE.Group();

  // Long slender body (lies along +Z, head toward +Z).
  const bodyMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.35, metalness: 0.35,
    emissive: new THREE.Color(color), emissiveIntensity: 0.12,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.85, 4, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x20282a, roughness: 0.4, metalness: 0.2 }),
  );
  head.position.z = 0.5;
  group.add(head);

  // Four near-horizontal translucent wings (two pairs).
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xe6f7ff, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.1,
    side: THREE.DoubleSide, emissive: new THREE.Color(0x88ccff), emissiveIntensity: 0.05,
  });
  const wingShape = new THREE.Shape();
  wingShape.absellipse(0.34, 0, 0.34, 0.1, 0, Math.PI * 2, false, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 14);

  const wings = [];
  const mkWing = (side, fwd) => {
    const w = new THREE.Mesh(wingGeo, wingMat);
    w.position.set(0, 0.04, fwd);
    w.rotation.x = -Math.PI / 2; // lay it flat (horizontal)
    w.scale.x = side;            // mirror for the left side
    group.add(w);
    wings.push(w);
  };
  mkWing(1, 0.16); mkWing(-1, 0.16); mkWing(1, -0.04); mkWing(-1, -0.04);

  return { group, wings };
}

export class DragonflyField {
  constructor(scene, count = 5) {
    this.group = new THREE.Group();
    this._flies = [];
    this._lastTime = 0;
    this._dir = new THREE.Vector3(); // shared scratch (no per-frame allocation)

    for (let i = 0; i < count; i++) {
      const color = BODY_COLORS[i % BODY_COLORS.length];
      const { group, wings } = buildDragonfly(color);
      group.scale.setScalar(0.7 + Math.random() * 0.4);

      // Most anchor over the pond; a few roam the meadow.
      const overPond = i % 3 !== 0;
      const ax = overPond ? POND.x + (Math.random() - 0.5) * 5 : (Math.random() - 0.5) * 16;
      const az = overPond ? POND.z + (Math.random() - 0.5) * 5 : (Math.random() - 0.5) * 12;
      const ay = (overPond ? 1.0 : 1.8) + Math.random() * 1.6;

      const anchor = new THREE.Vector3(ax, ay, az);
      const pos = anchor.clone();
      this.group.add(group);
      this._flies.push({
        group, wings, anchor, pos,
        vel: new THREE.Vector3(),
        target: anchor.clone(),
        retarget: Math.random() * 1.5,
        range: overPond ? 3.2 : 4.5,
        speed: 5 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
      });
    }

    scene.add(this.group);
  }

  update(time) {
    const t = time * 0.001;
    const dt = this._lastTime ? Math.min(t - this._lastTime, 0.1) : 0;
    this._lastTime = t;

    for (const d of this._flies) {
      d.retarget -= dt;
      if (d.retarget <= 0 || d.pos.distanceTo(d.target) < 0.45) {
        // Pick a new nearby target → a quick dart, then a pause.
        d.target.set(
          d.anchor.x + (Math.random() - 0.5) * 2 * d.range,
          d.anchor.y + (Math.random() - 0.5) * 1.4,
          d.anchor.z + (Math.random() - 0.5) * 2 * d.range,
        );
        d.retarget = 0.5 + Math.random() * 1.6;
      }

      // Ease velocity toward the target direction (fast = darting).
      this._dir.copy(d.target).sub(d.pos);
      const dist = this._dir.length();
      if (dist > 0.001) this._dir.multiplyScalar(d.speed / dist);
      d.vel.lerp(this._dir, 0.08);
      d.pos.addScaledVector(d.vel, dt);
      d.group.position.copy(d.pos);

      // Face direction of travel (+ a little pitch with vertical speed).
      const sp = d.vel.length();
      if (sp > 0.05) {
        d.group.rotation.y = Math.atan2(d.vel.x, d.vel.z);
        d.group.rotation.x = -Math.asin(THREE.MathUtils.clamp(d.vel.y / sp, -1, 1)) * 0.5;
      }

      // Fast, subtle wing shimmer (real dragonfly wings blur, so keep it small).
      const flutter = Math.sin(t * 40 + d.phase) * 0.18;
      for (let w = 0; w < d.wings.length; w++) {
        d.wings[w].rotation.z = (w % 2 === 0 ? 1 : -1) * flutter;
      }
    }
  }
}
