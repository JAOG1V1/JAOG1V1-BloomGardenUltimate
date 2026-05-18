import * as THREE from "three";

const WING_COLORS = [
  [0xff6fe8, 0xffa0f0],
  [0x7ef0ff, 0xa0c8ff],
  [0xffd166, 0xffb347],
  [0xb06fff, 0xd0a0ff],
  [0x7ef0b5, 0x40e0a0],
];

function buildButterfly(topColor, bottomColor) {
  const group = new THREE.Group();

  // Left wing (top)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.bezierCurveTo(-0.7, 0.2, -1.1, 0.9, -0.6, 1.2);
  wingShape.bezierCurveTo(-0.2, 1.4, 0.0, 0.8, 0, 0);

  // Right wing (top) - mirrored
  const wingShapeR = new THREE.Shape();
  wingShapeR.moveTo(0, 0);
  wingShapeR.bezierCurveTo(0.7, 0.2, 1.1, 0.9, 0.6, 1.2);
  wingShapeR.bezierCurveTo(0.2, 1.4, 0.0, 0.8, 0, 0);

  // Bottom wing
  const wingShapeB = new THREE.Shape();
  wingShapeB.moveTo(0, 0);
  wingShapeB.bezierCurveTo(-0.5, -0.1, -0.8, -0.7, -0.4, -0.9);
  wingShapeB.bezierCurveTo(-0.1, -1.0, 0.0, -0.5, 0, 0);

  const wingShapeBR = new THREE.Shape();
  wingShapeBR.moveTo(0, 0);
  wingShapeBR.bezierCurveTo(0.5, -0.1, 0.8, -0.7, 0.4, -0.9);
  wingShapeBR.bezierCurveTo(0.1, -1.0, 0.0, -0.5, 0, 0);

  const mat1 = new THREE.MeshStandardMaterial({
    color: topColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    roughness: 0.3,
    emissive: new THREE.Color(topColor),
    emissiveIntensity: 0.15,
  });
  const mat2 = new THREE.MeshStandardMaterial({
    color: bottomColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    roughness: 0.3,
    emissive: new THREE.Color(bottomColor),
    emissiveIntensity: 0.1,
  });

  const mkMesh = (shape, mat) => new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), mat);

  const wL  = mkMesh(wingShape,   mat1);
  const wR  = mkMesh(wingShapeR,  mat1);
  const wBL = mkMesh(wingShapeB,  mat2);
  const wBR = mkMesh(wingShapeBR, mat2);

  // Body
  const bodyGeo = new THREE.CapsuleGeometry(0.06, 0.5, 6, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;

  // Left/right wing pivots so we can flap them
  const leftPivot  = new THREE.Group();
  const rightPivot = new THREE.Group();

  leftPivot.add(wL);
  leftPivot.add(wBL);
  rightPivot.add(wR);
  rightPivot.add(wBR);

  group.add(leftPivot);
  group.add(rightPivot);
  group.add(body);

  return { group, leftPivot, rightPivot };
}

export class ButterflyField {
  constructor(scene, count = 8) {
    this.group = new THREE.Group();
    this._butterflies = [];

    for (let i = 0; i < count; i++) {
      const ci = i % WING_COLORS.length;
      const [c1, c2] = WING_COLORS[ci];
      const { group, leftPivot, rightPivot } = buildButterfly(c1, c2);

      // Random flight path centre
      const cx = (Math.random() - 0.5) * 16;
      const cz = (Math.random() - 0.5) * 12;
      const cy = 1.5 + Math.random() * 2.5;
      const radius = 2 + Math.random() * 3;
      const speed  = 0.3 + Math.random() * 0.4;
      const phase  = Math.random() * Math.PI * 2;
      const scale  = 0.25 + Math.random() * 0.15;

      group.scale.setScalar(scale);
      this.group.add(group);

      this._butterflies.push({ group, leftPivot, rightPivot, cx, cy, cz, radius, speed, phase });
    }

    scene.add(this.group);
  }

  update(time) {
    const t = time * 0.001;
    for (const b of this._butterflies) {
      const angle = t * b.speed + b.phase;
      // Figure-8 style path using sin/cos
      b.group.position.set(
        b.cx + Math.cos(angle) * b.radius,
        b.cy + Math.sin(angle * 1.7) * 0.6,
        b.cz + Math.sin(angle) * b.radius * 0.6,
      );

      // Face direction of travel
      const dx = -Math.sin(angle) * b.radius * b.speed;
      const dz =  Math.cos(angle) * b.radius * 0.6 * b.speed;
      b.group.rotation.y = Math.atan2(dx, dz);

      // Flap wings
      const flapAngle = Math.sin(t * 8 + b.phase) * 0.9;
      b.leftPivot.rotation.y  =  flapAngle;
      b.rightPivot.rotation.y = -flapAngle;
    }
  }
}
