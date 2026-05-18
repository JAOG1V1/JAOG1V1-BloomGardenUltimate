import * as THREE from "three";

/** Instanced grass blades covering the garden floor */
export class GrassField {
  constructor(scene, count = 1800) {
    this._count = count;

    // Thin blade geometry (flat quad oriented upright)
    const geo = new THREE.PlaneGeometry(0.06, 0.35, 1, 3);
    // Offset so base is at y=0
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setY(i, posAttr.getY(i) + 0.175);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x2d8a3e,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    this._mesh = new THREE.InstancedMesh(geo, mat, count);
    this._mesh.castShadow    = false;
    this._mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    this._offsets = new Float32Array(count * 2); // x, z per blade

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 1.5 + Math.random() * 25;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      this._offsets[i * 2]     = x;
      this._offsets[i * 2 + 1] = z;

      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.set(1, 0.8 + Math.random() * 0.6, 1);
      dummy.updateMatrix();
      this._mesh.setMatrixAt(i, dummy.matrix);
    }
    this._mesh.instanceMatrix.needsUpdate = true;

    scene.add(this._mesh);

    this._dummy = dummy;
  }

  update(time) {
    const t = time * 0.001;
    const dummy = this._dummy;

    for (let i = 0; i < this._count; i++) {
      const x = this._offsets[i * 2];
      const z = this._offsets[i * 2 + 1];
      dummy.position.set(x, 0, z);

      // Sway
      const sway = Math.sin(t * 1.4 + x * 0.3 + z * 0.2) * 0.12;
      dummy.rotation.z = sway;
      dummy.rotation.y = Math.sin(t * 0.4 + i * 0.1) * 0.05;
      dummy.scale.set(1, 0.8 + ((i * 0.1) % 0.6), 1);
      dummy.updateMatrix();
      this._mesh.setMatrixAt(i, dummy.matrix);
    }
    this._mesh.instanceMatrix.needsUpdate = true;
  }
}
