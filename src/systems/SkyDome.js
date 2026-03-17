import * as THREE from "three";

/** Animated sky dome with gradient top and cinematic glow bands */
export class SkyDome {
  constructor() {
    this.group = new THREE.Group();

    // Main sky sphere (viewed from inside)
    const skyGeo = new THREE.SphereGeometry(90, 64, 64);
    this.skyMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x2a1a6e),
      side: THREE.BackSide,
      fog: false
    });
    this.sky = new THREE.Mesh(skyGeo, this.skyMat);
    this.group.add(this.sky);

    // Horizontal aurora/glow bands
    this.bands = [];
    const bandColors = [0xff8ed8, 0x8bdcff, 0xd0a0ff, 0xffd166, 0xa8edea];
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.PlaneGeometry(30 + i * 4, 5 + Math.random() * 4);
      const mat = new THREE.MeshBasicMaterial({
        color: bandColors[i % bandColors.length],
        transparent: true,
        opacity: 0.055 + Math.random() * 0.035,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 22,
        12 + Math.random() * 10,
        -22 - i * 2.5
      );
      mesh.rotation.x = -0.3 - Math.random() * 0.2;
      this.group.add(mesh);
      this.bands.push({ mesh, speed: 0.0002 + Math.random() * 0.0003, phase: Math.random() * Math.PI * 2 });
    }

    // Star field
    this._buildStars();
  }

  _buildStars() {
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1) * 0.5; // upper hemisphere
      const r     = 82;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.abs(Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, transparent: true, opacity: 0.65, depthWrite: false });
    this.stars = new THREE.Points(geo, mat);
    this.group.add(this.stars);
  }

  update(time) {
    const t = time * 0.00008;
    // Slowly shift sky colour between deep indigo and twilight purple
    const h = 0.66 + Math.sin(t) * 0.04;
    this.skyMat.color.setHSL(h, 0.72, 0.22);

    // Animate glow bands
    this.bands.forEach(({ mesh, speed, phase }) => {
      mesh.position.x = Math.sin(time * speed + phase) * 8;
      mesh.material.opacity = 0.04 + Math.abs(Math.sin(time * speed * 0.7 + phase)) * 0.04;
    });

    // Slowly rotate stars
    this.stars.rotation.y = time * 0.000018;
  }
}
