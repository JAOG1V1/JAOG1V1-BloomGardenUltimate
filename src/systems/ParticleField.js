import * as THREE from "three";

/** Floating ambient dust / magical sparkle particles */
export class ParticleField {
  constructor(count = 900) {
    this.count = count;

    const positions  = new Float32Array(count * 3);
    const colors     = new Float32Array(count * 3);
    const sizes      = new Float32Array(count);

    const palette = [
      new THREE.Color(0xff8bd0),
      new THREE.Color(0xffd166),
      new THREE.Color(0x7ef0b5),
      new THREE.Color(0xc084fc),
      new THREE.Color(0x8bdcff)
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = Math.random() * 22 - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = Math.random() * 1.8 + 0.3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size",     new THREE.BufferAttribute(sizes, 1));

    this._positions = positions;

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.12,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(geo, mat);
  }

  update(time) {
    const pos  = this._positions;
    const t    = time * 0.001;
    for (let i = 0; i < this.count; i++) {
      // Gentle upward drift with sinusoidal sway
      pos[i * 3 + 1] += 0.005 + Math.sin(t + i * 0.7) * 0.002;
      pos[i * 3]     += Math.cos(t * 0.4 + i * 0.5) * 0.001;

      // Wrap particles back to bottom when they drift too high
      if (pos[i * 3 + 1] > 22) {
        pos[i * 3 + 1] = -1;
        pos[i * 3]     = (Math.random() - 0.5) * 70;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;

    this.points.rotation.y = time * 0.000025;
  }
}
