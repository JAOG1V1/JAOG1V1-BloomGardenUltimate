import * as THREE from "three";

function buildBee(scale = 1) {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.SphereGeometry(0.12 * scale, 10, 8);
  bodyGeo.scale(1, 0.8, 1.4);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5c400, roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Stripes (rings)
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.TorusGeometry(0.12 * scale, 0.025 * scale, 6, 12);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = (-0.08 + i * 0.08) * scale;
    group.add(ring);
  }

  // Wings
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xd0f0ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.55,
    roughness: 0.1,
  });
  const wGeo = new THREE.EllipseCurve(0, 0, 0.22 * scale, 0.12 * scale, 0, Math.PI * 2, false, 0);
  const wPoints = wGeo.getPoints(16);
  const wShape = new THREE.Shape(wPoints);
  const wGeoShape = new THREE.ShapeGeometry(wShape);

  const leftWing  = new THREE.Mesh(wGeoShape, wingMat);
  const rightWing = new THREE.Mesh(wGeoShape, wingMat);
  leftWing.position.set(-0.18 * scale,  0.08 * scale, 0);
  rightWing.position.set( 0.18 * scale, 0.08 * scale, 0);
  group.add(leftWing);
  group.add(rightWing);

  return { group, leftWing, rightWing };
}

export class BeeField {
  constructor(scene, flowerPositions, count = 6) {
    this._bees = [];
    this._flowers = flowerPositions;

    // Scratch vectors reused every frame so the flight path math allocates
    // nothing inside the animation loop (no per-frame GC pressure).
    this._mid  = new THREE.Vector3();
    this._pos  = new THREE.Vector3();
    this._prev = new THREE.Vector3();
    this._dir  = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const scale = 0.8 + Math.random() * 0.4;
      const { group, leftWing, rightWing } = buildBee(scale);

      const startFlower = Math.floor(Math.random() * flowerPositions.length);
      const targetFlower = (startFlower + 1 + Math.floor(Math.random() * (flowerPositions.length - 1))) % flowerPositions.length;

      const pos = flowerPositions[startFlower].clone();
      pos.y += 0.8 + Math.random();
      group.position.copy(pos);
      group.scale.setScalar(scale);

      scene.add(group);
      this._bees.push({
        group, leftWing, rightWing,
        srcIdx: startFlower,
        dstIdx: targetFlower,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        yOff: 0.8 + Math.random() * 0.8,
      });
    }
  }

  update(time) {
    const t = time * 0.001;
    for (const b of this._bees) {
      b.progress += b.speed;
      if (b.progress >= 1) {
        b.progress = 0;
        b.srcIdx = b.dstIdx;
        b.dstIdx = Math.floor(Math.random() * this._flowers.length);
        if (b.dstIdx === b.srcIdx) b.dstIdx = (b.dstIdx + 1) % this._flowers.length;
      }

      const src = this._flowers[b.srcIdx];
      const dst = this._flowers[b.dstIdx];
      const p = b.progress;

      // Quadratic Bezier with arc (reuses scratch vectors — no allocations)
      const mid = this._mid.addVectors(src, dst).multiplyScalar(0.5);
      mid.y += 2.5;

      const pos = this._pos.set(
        (1 - p) * (1 - p) * src.x + 2 * (1 - p) * p * mid.x + p * p * dst.x,
        (1 - p) * (1 - p) * (src.y + b.yOff) + 2 * (1 - p) * p * mid.y + p * p * (dst.y + b.yOff),
        (1 - p) * (1 - p) * src.z + 2 * (1 - p) * p * mid.z + p * p * dst.z,
      );

      // Face direction of travel
      if (b.progress > 0.01) {
        const pp = b.progress - 0.01;
        const prevPos = this._prev.set(
          (1 - pp) * (1 - pp) * src.x + 2 * (1 - pp) * pp * mid.x + pp * pp * dst.x,
          0,
          (1 - pp) * (1 - pp) * src.z + 2 * (1 - pp) * pp * mid.z + pp * pp * dst.z,
        );
        const dir = this._dir.subVectors(pos, prevPos);
        if (dir.length() > 0.0001) b.group.rotation.y = Math.atan2(dir.x, dir.z);
      }

      b.group.position.copy(pos);

      // Wing flap
      const flapAngle = Math.sin(t * 20 + b.phase) * 0.5;
      b.leftWing.rotation.y  =  flapAngle;
      b.rightWing.rotation.y = -flapAngle;
    }
  }
}
