import * as THREE from "three";
import { softCircleTexture } from "../systems/textures.js";

/** Falling petal particle system — petals drift down from above */
export class PetalParticles {
  constructor(scene, count = 120) {
    this._count = count;

    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(0xff8bd0),
      new THREE.Color(0xffc1e0),
      new THREE.Color(0xffd166),
      new THREE.Color(0xffe4a0),
      new THREE.Color(0xb06fff),
      new THREE.Color(0xd0a0ff),
      new THREE.Color(0xff6fb6),
    ];

    this._vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // Horizontal drift + fall speed
      this._vel[i * 3]     = (Math.random() - 0.5) * 0.008;
      this._vel[i * 3 + 1] = -(0.006 + Math.random() * 0.008);
      this._vel[i * 3 + 2] = (Math.random() - 0.5) * 0.006;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

    this._positions = positions;

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      map: softCircleTexture(),
      alphaMap: softCircleTexture(),
      size: 0.4,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geo, mat);
    scene.add(this.points);
  }

  update(time) {
    const t = time * 0.001;
    const pos = this._positions;
    const vel = this._vel;

    for (let i = 0; i < this._count; i++) {
      pos[i * 3]     += vel[i * 3]     + Math.sin(t * 0.7 + i * 1.1) * 0.003;
      pos[i * 3 + 1] += vel[i * 3 + 1];
      pos[i * 3 + 2] += vel[i * 3 + 2] + Math.cos(t * 0.5 + i * 0.9) * 0.002;

      // Reset when hitting ground
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3]     = (Math.random() - 0.5) * 26;
        pos[i * 3 + 1] = 8 + Math.random() * 6;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
