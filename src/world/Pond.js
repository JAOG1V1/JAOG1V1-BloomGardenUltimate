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

    // ── Water lilies (lily pads, some with a little flower) ───────────────────
    this._lilies = this._buildLilies(RADIUS);

    scene.add(this.group);
  }

  /** A flat lily pad (notched disc) with an optional small flower on top. */
  _buildLilyPad(radius, withFlower) {
    const pad = new THREE.Group();

    // Notched disc: a circle with a wedge cut out, like a real lily pad.
    const shape = new THREE.Shape();
    const notch = 0.5; // radians of the wedge gap
    shape.absarc(0, 0, radius, notch, Math.PI * 2 - notch, false);
    shape.lineTo(0, 0);
    const padGeo = new THREE.ShapeGeometry(shape, 24);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3f8f4a,
      roughness: 0.55,
      metalness: 0.0,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x0a2a10),
      emissiveIntensity: 0.15,
    });
    const disc = new THREE.Mesh(padGeo, padMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.05;
    pad.add(disc);

    if (withFlower) {
      const flower = new THREE.Group();
      const petalColor = Math.random() < 0.5 ? 0xfff0f6 : 0xffc6e0;
      const petalMat = new THREE.MeshStandardMaterial({
        color: petalColor,
        roughness: 0.4,
        emissive: new THREE.Color(petalColor),
        emissiveIntensity: 0.12,
        side: THREE.DoubleSide,
      });
      const petalGeo = new THREE.SphereGeometry(radius * 0.28, 6, 5);
      petalGeo.scale(0.5, 0.32, 1);
      const ring = 6;
      for (let i = 0; i < ring; i++) {
        const p = new THREE.Mesh(petalGeo, petalMat);
        const a = (i / ring) * Math.PI * 2;
        p.position.set(Math.cos(a) * radius * 0.28, 0.08, Math.sin(a) * radius * 0.28);
        p.rotation.y = -a;
        p.rotation.x = 0.5;
        flower.add(p);
      }
      const coreGeo = new THREE.SphereGeometry(radius * 0.16, 8, 6);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xffe066, roughness: 0.5,
        emissive: new THREE.Color(0xffcc33), emissiveIntensity: 0.25,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.1;
      flower.add(core);
      flower.position.y = 0.06;
      pad.add(flower);
    }

    return pad;
  }

  _buildLilies(pondRadius) {
    const lilies = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const r = 0.34 + Math.random() * 0.28;
      const pad = this._buildLilyPad(r, i % 2 === 0); // every other pad blooms
      // Scatter on the water, keeping clear of the shore.
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * (pondRadius - r - 0.5);
      pad.position.set(Math.cos(ang) * dist, 0.0, Math.sin(ang) * dist);
      pad.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(pad);
      lilies.push({
        pad,
        baseY: 0.0,
        phase: Math.random() * Math.PI * 2,
        drift: 0.15 + Math.random() * 0.2,
      });
    }
    return lilies;
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

    // Lily pads bob and rock gently on the surface.
    for (const l of this._lilies) {
      l.pad.position.y = l.baseY + Math.sin(t * 0.9 + l.phase) * 0.03;
      l.pad.rotation.z = Math.sin(t * l.drift + l.phase) * 0.04;
      l.pad.rotation.x = Math.cos(t * l.drift * 0.8 + l.phase) * 0.04;
    }
  }
}
