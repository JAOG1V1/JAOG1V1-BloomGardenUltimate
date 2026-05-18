import * as THREE from "three";

// ─── Petal helper ───────────────────────────────────────────────────────────
function buildPetal(color = 0xff5fb3, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.28 * scale, 0.38 * scale, -0.18 * scale, 0.9 * scale,  0, 1.35 * scale);
  shape.bezierCurveTo( 0.18 * scale, 0.9 * scale,  0.28 * scale, 0.38 * scale, 0, 0);

  const geo = new THREE.ShapeGeometry(shape, 28);
  const mat = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    roughness: 0.45,
    metalness: 0.0
  });
  return new THREE.Mesh(geo, mat);
}

// ─── Narrow pointed petal (daisy/aster style) ───────────────────────────────
function buildNarrowPetal(color, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.1 * scale, 0.3 * scale, -0.08 * scale, 0.8 * scale, 0, 1.1 * scale);
  shape.bezierCurveTo( 0.08 * scale, 0.8 * scale,  0.1 * scale, 0.3 * scale, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 16);
  const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95, roughness: 0.5 });
  return new THREE.Mesh(geo, mat);
}

// ─── Tulip cup petal ────────────────────────────────────────────────────────
function buildTulipPetal(color, scale = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.22 * scale, 0);
  shape.bezierCurveTo(-0.35 * scale, 0.5 * scale, -0.3 * scale, 1.0 * scale, 0, 1.2 * scale);
  shape.bezierCurveTo( 0.3 * scale,  1.0 * scale,  0.35 * scale, 0.5 * scale, 0.22 * scale, 0);
  shape.lineTo(-0.22 * scale, 0);
  const geo = new THREE.ShapeGeometry(shape, 20);
  const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95, roughness: 0.35 });
  return new THREE.Mesh(geo, mat);
}

// ─── Single flower (original rose/large style) ──────────────────────────────
function buildFlower({ isMain = false, stemHeight = 3.2, petalCount = 10, petalColor = 0xffc15f, centerColor = 0xffd166, scale = 1 } = {}) {
  const group = new THREE.Group();

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.045 * scale, 0.07 * scale, stemHeight, 14);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2fa35f, roughness: 0.7 });
  const stem    = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = stemHeight / 2;
  group.add(stem);

  // Leaf (simple plane)
  const leafGeo = new THREE.PlaneGeometry(0.5 * scale, 1.2 * scale);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3cb85f, side: THREE.DoubleSide, roughness: 0.8 });
  const leaf    = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(0.3 * scale, stemHeight * 0.45, 0);
  leaf.rotation.z = 0.6;
  group.add(leaf);

  // Flower head
  const head = new THREE.Group();
  head.position.y = stemHeight;

  // Petals
  for (let i = 0; i < petalCount; i++) {
    const petal = buildPetal(petalColor, scale);
    const angle = (i / petalCount) * Math.PI * 2;
    petal.rotation.z = angle;
    petal.rotation.x = 0.18;
    head.add(petal);
  }

  // Inner ring of smaller petals (main flower only)
  if (isMain) {
    for (let i = 0; i < 10; i++) {
      const petal = buildPetal(0xff8bd0, scale * 0.55);
      const angle = (i / 10) * Math.PI * 2 + Math.PI / 10;
      petal.rotation.z = angle;
      petal.rotation.x = 0.3;
      head.add(petal);
    }
  }

  // Center disk
  const cGeo = new THREE.CircleGeometry(0.22 * scale, 32);
  const cMat = new THREE.MeshStandardMaterial({ color: centerColor, roughness: 0.3, emissive: new THREE.Color(centerColor), emissiveIntensity: 0.3 });
  const center = new THREE.Mesh(cGeo, cMat);
  center.rotation.x = -Math.PI / 2;
  head.add(center);

  group.add(head);

  return { group, head, petalMeshes: head.children.filter(c => c !== center), center, stemHeight };
}

// ─── Daisy / aster style ────────────────────────────────────────────────────
function buildDaisy({ stemHeight = 2.8, petalColor = 0xffffff, centerColor = 0xffd700, scale = 1 } = {}) {
  const group = new THREE.Group();

  const stemGeo = new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, stemHeight, 10);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x339944, roughness: 0.75 });
  group.add(Object.assign(new THREE.Mesh(stemGeo, stemMat), { position: new THREE.Vector3(0, stemHeight / 2, 0) }));

  const head = new THREE.Group();
  head.position.y = stemHeight;

  const petalCount = 18;
  for (let i = 0; i < petalCount; i++) {
    const p = buildNarrowPetal(petalColor, scale * 0.8);
    p.rotation.z = (i / petalCount) * Math.PI * 2;
    p.rotation.x = 0.08;
    head.add(p);
  }

  const cGeo = new THREE.CircleGeometry(0.18 * scale, 24);
  const cMat = new THREE.MeshStandardMaterial({ color: centerColor, roughness: 0.25, emissive: new THREE.Color(centerColor), emissiveIntensity: 0.35 });
  const center = new THREE.Mesh(cGeo, cMat);
  center.rotation.x = -Math.PI / 2;
  head.add(center);
  group.add(head);

  return { group, head, petalMeshes: head.children.filter(c => c !== center), center, stemHeight };
}

// ─── Tulip style ────────────────────────────────────────────────────────────
function buildTulip({ stemHeight = 3.5, petalColor = 0xff3366, scale = 1 } = {}) {
  const group = new THREE.Group();

  const stemGeo = new THREE.CylinderGeometry(0.05 * scale, 0.08 * scale, stemHeight, 10);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2fa355, roughness: 0.7 });
  const stem    = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = stemHeight / 2;
  group.add(stem);

  // Long strap-leaf
  const leafGeo = new THREE.PlaneGeometry(0.25 * scale, 2.0 * scale);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2c8e4a, side: THREE.DoubleSide, roughness: 0.8 });
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(-0.25 * scale, stemHeight * 0.55, 0);
  leaf.rotation.z = -0.35;
  group.add(leaf);

  const head = new THREE.Group();
  head.position.y = stemHeight;

  const petals = 6;
  for (let i = 0; i < petals; i++) {
    const p = buildTulipPetal(petalColor, scale);
    p.rotation.z = (i / petals) * Math.PI * 2;
    p.rotation.x = -0.25; // cup inward
    head.add(p);
  }
  group.add(head);

  return { group, head, petalMeshes: head.children, center: null, stemHeight };
}

// ─── Lotus / water-lily style ────────────────────────────────────────────────
function buildLotus({ petalColor = 0xffccee, centerColor = 0xffee88, scale = 1 } = {}) {
  const group = new THREE.Group();
  const head  = new THREE.Group();

  // Outer ring
  const outerPetals = 12;
  for (let i = 0; i < outerPetals; i++) {
    const p = buildPetal(petalColor, scale * 0.7);
    p.rotation.z = (i / outerPetals) * Math.PI * 2;
    p.rotation.x = -0.45;
    head.add(p);
  }
  // Inner ring
  for (let i = 0; i < 8; i++) {
    const p = buildPetal(new THREE.Color(petalColor).offsetHSL(0, 0.1, 0.1).getHex(), scale * 0.45);
    p.rotation.z = (i / 8) * Math.PI * 2 + Math.PI / 8;
    p.rotation.x = -0.7;
    head.add(p);
  }

  const cGeo = new THREE.CircleGeometry(0.16 * scale, 24);
  const cMat = new THREE.MeshStandardMaterial({ color: centerColor, roughness: 0.2, emissive: new THREE.Color(centerColor), emissiveIntensity: 0.5 });
  const center = new THREE.Mesh(cGeo, cMat);
  center.rotation.x = -Math.PI / 2;
  head.add(center);

  // Flat pad
  const padGeo = new THREE.CircleGeometry(1.0 * scale, 20);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.9, side: THREE.DoubleSide });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -0.05;
  group.add(pad);

  group.add(head);
  return { group, head, petalMeshes: head.children.filter(c => c !== center), center, stemHeight: 0 };
}

// ─── Sunflower style ────────────────────────────────────────────────────────
function buildSunflower({ stemHeight = 5.0, scale = 1 } = {}) {
  const group = new THREE.Group();

  const stemGeo = new THREE.CylinderGeometry(0.07 * scale, 0.1 * scale, stemHeight, 10);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a9a3a, roughness: 0.7 });
  const stem    = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = stemHeight / 2;
  group.add(stem);

  const head = new THREE.Group();
  head.position.y = stemHeight;

  // Ray petals (yellow)
  const rays = 22;
  for (let i = 0; i < rays; i++) {
    const p = buildNarrowPetal(0xffcc00, scale * 1.1);
    p.rotation.z = (i / rays) * Math.PI * 2;
    p.rotation.x = 0.05;
    head.add(p);
  }

  // Dark center disk
  const cGeo = new THREE.CircleGeometry(0.35 * scale, 32);
  const cMat = new THREE.MeshStandardMaterial({ color: 0x5a2d00, roughness: 0.7, emissive: new THREE.Color(0x3a1800), emissiveIntensity: 0.2 });
  const center = new THREE.Mesh(cGeo, cMat);
  center.rotation.x = -Math.PI / 2;
  head.add(center);
  group.add(head);

  return { group, head, petalMeshes: head.children.filter(c => c !== center), center, stemHeight };
}

// ─── FlowerField ────────────────────────────────────────────────────────────
export class FlowerField {
  constructor() {
    this.group   = new THREE.Group();
    this.flowers = [];

    // Central hero flower
    const main = buildFlower({
      isMain: true,
      stemHeight: 5.5,
      petalCount: 20,
      petalColor: 0xff5fb3,
      centerColor: 0xffd166,
      scale: 1.4
    });
    main.group.position.set(0, 0, 0);
    this.group.add(main.group);
    this.flowers.push(main);
    this.mainFlower = main;

    // Background flowers — mix of all species
    const configs = [
      { type: "rose",     color: 0xffc15f, cc: 0xffed8a, s: 0.75, petals: 12, h: 3.8 },
      { type: "rose",     color: 0xb06fff, cc: 0xd0a0ff, s: 0.65, petals: 8,  h: 3.2 },
      { type: "rose",     color: 0x7ef0b5, cc: 0xabffe0, s: 0.7,  petals: 10, h: 4.0 },
      { type: "rose",     color: 0xff8bd0, cc: 0xffd1ee, s: 0.55, petals: 9,  h: 2.8 },
      { type: "daisy",    color: 0xffffff, cc: 0xffd700, s: 0.8,  h: 2.6 },
      { type: "daisy",    color: 0xffe0f0, cc: 0xff8800, s: 0.7,  h: 2.2 },
      { type: "tulip",    color: 0xff3366, s: 0.8,  h: 3.5 },
      { type: "tulip",    color: 0xff9900, s: 0.75, h: 3.2 },
      { type: "tulip",    color: 0x9966ff, s: 0.7,  h: 3.8 },
      { type: "sunflower",                 s: 0.7,  h: 4.5 },
      { type: "sunflower",                 s: 0.6,  h: 5.0 },
    ];

    // Lotus flowers near the pond area
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI + (i - 1.5) * 0.3;
      const dist  = 9.5 + i * 0.5;
      const f = buildLotus({ petalColor: i % 2 === 0 ? 0xffccee : 0xffffff, scale: 0.6 + i * 0.1 });
      f.group.position.set(Math.cos(angle) * dist, 0.02, Math.sin(angle) * dist * 0.6);
      f.group.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(f.group);
      this.flowers.push(f);
    }

    for (let i = 0; i < 28; i++) {
      const cfg = configs[i % configs.length];
      let f;

      if (cfg.type === "daisy") {
        f = buildDaisy({ stemHeight: cfg.h, petalColor: cfg.color, centerColor: cfg.cc, scale: cfg.s });
      } else if (cfg.type === "tulip") {
        f = buildTulip({ stemHeight: cfg.h, petalColor: cfg.color, scale: cfg.s });
      } else if (cfg.type === "sunflower") {
        f = buildSunflower({ stemHeight: cfg.h, scale: cfg.s });
      } else {
        f = buildFlower({ stemHeight: cfg.h, petalCount: cfg.petals, petalColor: cfg.color, centerColor: cfg.cc, scale: cfg.s });
      }

      const angle = Math.random() * Math.PI * 2;
      const dist  = 3.5 + Math.random() * 10;
      f.group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist * 0.65);
      f.group.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(f.group);
      this.flowers.push(f);
    }

    // Ground plane
    const groundGeo = new THREE.CircleGeometry(28, 72);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a4a2e,
      roughness: 0.85
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Inner glow ring around base of main flower
    const ringGeo = new THREE.RingGeometry(0.6, 2.2, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff6fb6,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.glowRing = new THREE.Mesh(ringGeo, ringMat);
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = 0.01;
    this.group.add(this.glowRing);
  }

  /** Returns flat list of all flower world positions (for Bee routing etc.) */
  getFlowerPositions() {
    return this.flowers.map(f => f.group.position.clone());
  }

  /** Burst of energy — scale the main flower briefly */
  energize() {
    this._burst = 1.0;
  }

  update(time) {
    const t = time * 0.001;

    // Main flower breathing + burst
    const burst = this._burst || 0;
    const breathe = 1 + Math.sin(t * 1.8) * 0.04 + burst * 0.18;
    this.mainFlower.head.scale.setScalar(breathe);
    this.mainFlower.head.rotation.y = Math.sin(t * 0.6) * 0.12;

    // Petal hue shift on burst
    if (burst > 0) {
      const hue = (t * 0.5) % 1;
      this.mainFlower.petalMeshes.forEach(m => m.material.color.setHSL(hue, 0.95, 0.65));
      this._burst = Math.max(0, burst - 0.04);
    }

    // Glow ring pulse
    this.glowRing.material.opacity = 0.12 + Math.sin(t * 2.4) * 0.07 + burst * 0.22;
    this.glowRing.scale.setScalar(1 + Math.sin(t * 2.4) * 0.05);

    // Background flowers gentle sway
    for (let i = 1; i < this.flowers.length; i++) {
      const f = this.flowers[i];
      f.group.rotation.z = Math.sin(t * 0.7 + i * 1.3) * 0.06;
      if (f.head) f.head.rotation.y = t * (0.3 + (i % 3) * 0.15);
    }
  }
}
