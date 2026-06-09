import * as THREE from "three";

/**
 * BirdField — distant birds gliding in slow, lazy circles high above the garden.
 * They are deliberately simple silhouettes (two curved wings that flap slowly)
 * and sit far out / high up, so they add life to the sky without ever crowding
 * the foreground or costing much. Fog fades them gently into the horizon.
 */
function buildBird(color) {
  const group = new THREE.Group();

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.6, 0.16, 1.2, 0.0);
  wingShape.quadraticCurveTo(0.6, -0.05, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 8);

  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.9, metalness: 0.0,
    side: THREE.DoubleSide, transparent: true, opacity: 0.92, fog: true,
  });

  const leftPivot = new THREE.Group();
  const rightPivot = new THREE.Group();
  const lw = new THREE.Mesh(wingGeo, mat);
  const rw = new THREE.Mesh(wingGeo, mat);
  lw.scale.x = -1; // mirror to the left
  leftPivot.add(lw);
  rightPivot.add(rw);
  group.add(leftPivot, rightPivot);

  return { group, leftPivot, rightPivot };
}

export class BirdField {
  constructor(scene, count = 4) {
    this.group = new THREE.Group();
    this._birds = [];
    const colors = [0x2b2f3a, 0x3a3340, 0x26303a];

    for (let i = 0; i < count; i++) {
      const { group, leftPivot, rightPivot } = buildBird(colors[i % colors.length]);
      group.scale.setScalar(0.8 + Math.random() * 0.6);
      this.group.add(group);
      this._birds.push({
        group, leftPivot, rightPivot,
        radius: 26 + Math.random() * 20,
        height: 16 + Math.random() * 12,
        speed: 0.05 + Math.random() * 0.06,
        flap: 4 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        bob: 0.5 + Math.random() * 1.2,
        cx: (Math.random() - 0.5) * 10,
        cz: (Math.random() - 0.5) * 10,
      });
    }

    scene.add(this.group);
  }

  update(time) {
    const t = time * 0.001;
    for (const b of this._birds) {
      const a = t * b.speed + b.phase;
      const x = b.cx + Math.cos(a) * b.radius;
      const z = b.cz + Math.sin(a) * b.radius;
      const y = b.height + Math.sin(t * 0.5 + b.phase) * b.bob;
      b.group.position.set(x, y, z);
      // Face along the circle's tangent.
      b.group.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI / 2;
      // Slow wing flap.
      const flap = Math.sin(t * b.flap + b.phase) * 0.6 + 0.1;
      b.leftPivot.rotation.z = flap;
      b.rightPivot.rotation.z = -flap;
    }
  }
}
