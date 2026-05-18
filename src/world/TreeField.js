import * as THREE from "three";

const TREE_PALETTES = [
  { trunk: 0x5c3d1a, foliage: 0x2e7d32 },
  { trunk: 0x4a3728, foliage: 0x388e3c },
  { trunk: 0x6d4c41, foliage: 0x558b2f },
  { trunk: 0x795548, foliage: 0x33691e },
  { trunk: 0x4e342e, foliage: 0x1b5e20 },
];

function buildTree(palette, trunkH, canopyR) {
  const group = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, trunkH, 10);
  const trunkMat = new THREE.MeshStandardMaterial({ color: palette.trunk, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  // Layered foliage spheres
  const foliageMat = new THREE.MeshStandardMaterial({
    color: palette.foliage,
    roughness: 0.85,
  });

  const layers = [
    { r: canopyR * 1.0, y: trunkH + canopyR * 0.5 },
    { r: canopyR * 0.8, y: trunkH + canopyR * 1.1 },
    { r: canopyR * 0.6, y: trunkH + canopyR * 1.65 },
  ];

  const foliageGroups = [];
  for (const l of layers) {
    const fg = new THREE.Group();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(l.r, 12, 10), foliageMat);
    sphere.castShadow    = true;
    sphere.receiveShadow = true;
    fg.add(sphere);
    fg.position.y = l.y;
    group.add(fg);
    foliageGroups.push(fg);
  }

  return { group, foliageGroups };
}

export class TreeField {
  constructor(scene, count = 8) {
    this.group = new THREE.Group();
    this._trees = [];

    for (let i = 0; i < count; i++) {
      const palette = TREE_PALETTES[i % TREE_PALETTES.length];
      const trunkH  = 2.5 + Math.random() * 2.5;
      const canopyR = 1.2 + Math.random() * 0.8;
      const { group, foliageGroups } = buildTree(palette, trunkH, canopyR);

      const angle = Math.random() * Math.PI * 2;
      const dist  = 8 + Math.random() * 14;
      group.position.set(
        Math.cos(angle) * dist,
        0,
        Math.sin(angle) * dist,
      );
      group.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.8 + Math.random() * 0.4;
      group.scale.setScalar(s);

      this.group.add(group);
      this._trees.push({
        group,
        foliageGroups,
        phase: Math.random() * Math.PI * 2,
      });
    }

    scene.add(this.group);
  }

  update(time) {
    const t = time * 0.001;
    for (const tree of this._trees) {
      // Gentle trunk sway
      tree.group.rotation.z = Math.sin(t * 0.6 + tree.phase) * 0.03;

      // Foliage sway — top layers sway more
      tree.foliageGroups.forEach((fg, i) => {
        fg.rotation.z = Math.sin(t * 0.8 + tree.phase + i * 0.5) * (0.02 + i * 0.015);
        fg.rotation.x = Math.sin(t * 0.5 + tree.phase + i * 0.3) * 0.015;
      });
    }
  }
}
