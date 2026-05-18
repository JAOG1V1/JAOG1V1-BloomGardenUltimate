import * as THREE from "three";

/** Animated pond with rippling surface */
export class Pond {
  constructor(scene) {
    this.group = new THREE.Group();

    const RADIUS = 3.5;
    const SEGS   = 48;

    // Water surface
    const geo = new THREE.CircleGeometry(RADIUS, SEGS);
    this._waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x2288cc,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.82,
      reflectivity: 0.9,
      ior: 1.33,
      emissive: new THREE.Color(0x003366),
      emissiveIntensity: 0.08,
    });

    this._water = new THREE.Mesh(geo, this._waterMat);
    this._water.rotation.x = -Math.PI / 2;
    this._water.position.y = 0.02;
    this._water.receiveShadow = true;
    this.group.add(this._water);

    // Store original vertex positions for ripple animation
    this._origPos = geo.attributes.position.array.slice();
    this._posAttr  = geo.attributes.position;

    // Ripple rings (decorative circles)
    this._rings = [];
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(0.2, 0.28, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      this.group.add(ring);
      this._rings.push({ mesh: ring, mat: ringMat, phase: (i / 3) * Math.PI * 2 });
    }

    // Bank / shore (slightly raised edge)
    const bankGeo = new THREE.TorusGeometry(RADIUS + 0.05, 0.25, 8, SEGS);
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x3a6e3a, roughness: 0.85 });
    const bank = new THREE.Mesh(bankGeo, bankMat);
    bank.rotation.x = -Math.PI / 2;
    bank.position.y = -0.12;
    this.group.add(bank);

    // Water sparkle light
    this._sparkle = new THREE.PointLight(0x80ccff, 0.4, 8);
    this._sparkle.position.y = 1.5;
    this.group.add(this._sparkle);

    scene.add(this.group);
  }

  update(time) {
    const t = time * 0.001;

    // Animate water surface vertices (gentle ripple)
    const pos = this._posAttr;
    const orig = this._origPos;
    for (let i = 0; i < pos.count; i++) {
      const ox = orig[i * 3];
      const oz = orig[i * 3 + 2]; // CircleGeometry is XZ plane before rotation
      const dist = Math.sqrt(ox * ox + oz * oz);
      pos.setZ(i, Math.sin(dist * 1.8 - t * 2.5) * 0.04 * (1 - dist / 3.5));
    }
    pos.needsUpdate = true;
    this._water.geometry.computeVertexNormals();

    // Animate emissive
    this._waterMat.emissiveIntensity = 0.05 + Math.sin(t * 1.2) * 0.04;
    this._sparkle.intensity = 0.3 + Math.sin(t * 2.5) * 0.15;

    // Ripple rings
    for (const r of this._rings) {
      const s = (Math.sin(t * 0.8 + r.phase) + 1) * 0.5;
      r.mesh.scale.setScalar(0.5 + s * 3.5);
      r.mat.opacity = Math.max(0, (1 - s) * 0.35);
    }
  }
}
