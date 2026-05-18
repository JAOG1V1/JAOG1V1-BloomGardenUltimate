import * as THREE from "three";

const ROCK_COLORS = [0x888888, 0x6a6a78, 0x887755, 0x7a8088, 0x665544];

export class RockField {
  constructor(scene, count = 14) {
    this.group = new THREE.Group();

    for (let i = 0; i < count; i++) {
      const color = ROCK_COLORS[i % ROCK_COLORS.length];
      const scale = 0.15 + Math.random() * 0.35;
      const detail = 1 + Math.floor(Math.random() * 2);
      const geo = new THREE.IcosahedronGeometry(1, detail);

      // Perturb vertices for natural look
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        pos.setX(j, pos.getX(j) + (Math.random() - 0.5) * 0.3);
        pos.setY(j, pos.getY(j) + (Math.random() - 0.5) * 0.2);
        pos.setZ(j, pos.getZ(j) + (Math.random() - 0.5) * 0.3);
      }
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0.02,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(scale, scale * 0.6, scale);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = (Math.random() - 0.5) * 0.3;

      const angle = Math.random() * Math.PI * 2;
      const dist  = 2.5 + Math.random() * 12;
      mesh.position.set(
        Math.cos(angle) * dist,
        scale * 0.3,
        Math.sin(angle) * dist,
      );
      mesh.castShadow    = true;
      mesh.receiveShadow = true;

      this.group.add(mesh);
    }

    scene.add(this.group);
  }

  /** Rocks are static; update() is a no-op kept for API consistency */
  update(_time) {}
}
