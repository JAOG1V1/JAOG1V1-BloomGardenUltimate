import * as THREE from "three";

/** Animated sky dome with gradient top, cinematic glow bands, moon and stars */
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
        opacity: 0.03 + Math.random() * 0.02,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 22,
        16 + Math.random() * 12,
        -28 - i * 2.5
      );
      mesh.rotation.x = -0.3 - Math.random() * 0.2;
      this.group.add(mesh);
      this.bands.push({ mesh, speed: 0.0002 + Math.random() * 0.0003, phase: Math.random() * Math.PI * 2, baseOpacity: 0.03 + Math.random() * 0.02 });
    }

    // Star field
    this._buildStars();

    // Moon
    this._buildMoon();

    // Horizon glow (sunrise/sunset)
    const horizonGeo = new THREE.PlaneGeometry(200, 18);
    this._horizonMat = new THREE.MeshBasicMaterial({
      color: 0xff6030,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const horizon = new THREE.Mesh(horizonGeo, this._horizonMat);
    horizon.position.set(0, 4, -85);
    this.group.add(horizon);

    // Current phase (set by DayNightCycle)
    this._skyH = 0.63;
    this._skyS = 0.52;
    this._skyL = 0.05;
  }

  _buildStars() {
    const count = 800;
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
    this._starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.32, transparent: true, opacity: 0.0, depthWrite: false });
    this.stars = new THREE.Points(geo, this._starMat);
    this.group.add(this.stars);
  }

  _buildMoon() {
    const moonGeo = new THREE.SphereGeometry(2.2, 20, 20);
    this._moonMat = new THREE.MeshStandardMaterial({
      color: 0xeeeebb,
      roughness: 0.9,
      emissive: new THREE.Color(0xaaaaaa),
      emissiveIntensity: 0.0,
      fog: false,
    });
    this.moon = new THREE.Mesh(moonGeo, this._moonMat);
    this.moon.position.set(-40, 55, -40);
    this.moon.visible = false;
    this.group.add(this.moon);
  }

  /** Called by DayNightCycle each frame */
  setSkyPhase(h, s, l) {
    this._skyH = h;
    this._skyS = s;
    this._skyL = l;

    // Night factor: how dark is the sky
    const nightF = Math.max(0, 1 - l / 0.35);

    this._starMat.opacity = Math.min(0.85, nightF * 1.2);
    this.moon.visible = nightF > 0.1;
    this._moonMat.emissiveIntensity = nightF * 0.6;

    // Horizon glow: brightest near dawn/dusk (l around 0.38–0.45)
    const horizonF = Math.max(0, 1 - Math.abs(l - 0.40) / 0.18) * (h < 0.2 || h > 0.7 ? 1 : 0);
    this._horizonMat.opacity = horizonF * 0.5;

    // Aurora bands: only visible at night
    this.bands.forEach(b => {
      b.mesh.material.opacity = b.baseOpacity * nightF * 0.9;
    });
  }

  update(time) {
    // Apply current sky colour
    this.skyMat.color.setHSL(this._skyH, this._skyS, this._skyL);

    // Animate glow bands
    this.bands.forEach(({ mesh, speed, phase }) => {
      mesh.position.x = Math.sin(time * speed + phase) * 8;
    });

    // Slowly rotate stars and moon
    this.stars.rotation.y = time * 0.000018;
    this.moon.rotation.y  = time * 0.00001;
  }
}
