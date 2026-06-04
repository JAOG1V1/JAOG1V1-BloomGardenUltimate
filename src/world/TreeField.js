import * as THREE from "three";

/**
 * TreeField — stylised low-poly trees that ring the garden.
 *
 * Design notes:
 *  • Trees are placed OUTSIDE the camera's orbit radius (the camera orbits at
 *    r ≈ 14), out near the scenery border, so nothing large ever crosses
 *    between the camera and the central hero flower.
 *  • Three canopy archetypes give variety of silhouette: layered "blob" canopy,
 *    stacked conifer cones and a tall slender crown. Each is jittered for a
 *    hand-made, asymmetric feel.
 *  • Flat shading keeps the look consistent with the rest of the low-poly world.
 *  • updateFade() is a safety net: should anything still drift in front of the
 *    flower, its foliage gently fades so the hero flower is never obscured.
 */

const TREE_PALETTES = [
  { trunk: 0x5c3d1a, foliage: 0x3f9d4a },
  { trunk: 0x4a3728, foliage: 0x46ad52 },
  { trunk: 0x6d4c41, foliage: 0x5fb05a },
  { trunk: 0x795548, foliage: 0x6cbf4f },
  { trunk: 0x4e342e, foliage: 0x2f8f3c },
  { trunk: 0x6b4a2f, foliage: 0x86c46a },
];

// Deterministic RNG so the layout never pops between reloads.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTrunk(palette, trunkH, rng) {
  const r = 0.16 + rng() * 0.08;
  const trunkGeo = new THREE.CylinderGeometry(r * 0.7, r * 1.5, trunkH, 7);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: palette.trunk,
    roughness: 0.95,
    flatShading: true,
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  // Slight lean for character.
  trunk.rotation.z = (rng() - 0.5) * 0.12;
  return { trunk, trunkMat };
}

/** A single canopy blob (icosahedron → faceted, stylised foliage). */
function blob(mat, radius, rng) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), mat);
  m.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
  m.scale.y = 0.85 + rng() * 0.3;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildTree(palette, rng) {
  const group = new THREE.Group();
  const kind = Math.floor(rng() * 3); // 0 blob, 1 conifer, 2 tall crown

  const foliageColor = new THREE.Color(palette.foliage);
  // Per-tree hue/lightness jitter for tonal variety.
  const hsl = { h: 0, s: 0, l: 0 };
  foliageColor.getHSL(hsl);
  foliageColor.setHSL(
    hsl.h + (rng() - 0.5) * 0.05,
    THREE.MathUtils.clamp(hsl.s + (rng() - 0.5) * 0.18, 0.3, 0.9),
    THREE.MathUtils.clamp(hsl.l + (rng() - 0.5) * 0.12, 0.25, 0.6),
  );
  const foliageMat = new THREE.MeshStandardMaterial({
    color: foliageColor,
    roughness: 0.85,
    flatShading: true,
    transparent: true,   // enables the obstruction fade safety net
    opacity: 1,
  });

  let trunkH, canopyR;
  const foliageGroups = [];

  if (kind === 1) {
    // ── Stacked conifer cones ──────────────────────────────────────────────
    trunkH = 1.4 + rng() * 1.0;
    canopyR = 1.1 + rng() * 0.5;
    const { trunk } = makeTrunk(palette, trunkH, rng);
    group.add(trunk);
    const tiers = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < tiers; i++) {
      const f = i / tiers;
      const r = canopyR * (1 - f * 0.7);
      const h = 1.5 * (1 - f * 0.4);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), foliageMat);
      cone.castShadow = true;
      cone.receiveShadow = true;
      const fg = new THREE.Group();
      fg.add(cone);
      fg.position.set(
        (rng() - 0.5) * 0.2,
        trunkH + i * (h * 0.62) + 0.4,
        (rng() - 0.5) * 0.2,
      );
      group.add(fg);
      foliageGroups.push(fg);
    }
  } else if (kind === 2) {
    // ── Tall slender crown ─────────────────────────────────────────────────
    trunkH = 3.4 + rng() * 1.8;
    canopyR = 1.0 + rng() * 0.5;
    const { trunk } = makeTrunk(palette, trunkH, rng);
    group.add(trunk);
    const layers = [
      { r: canopyR * 1.0, y: trunkH + canopyR * 0.4 },
      { r: canopyR * 0.78, y: trunkH + canopyR * 1.1 },
      { r: canopyR * 0.52, y: trunkH + canopyR * 1.7 },
    ];
    for (const l of layers) {
      const fg = new THREE.Group();
      const b = blob(foliageMat, l.r, rng);
      b.position.set((rng() - 0.5) * 0.35, 0, (rng() - 0.5) * 0.35);
      fg.add(b);
      fg.position.y = l.y;
      group.add(fg);
      foliageGroups.push(fg);
    }
  } else {
    // ── Rounded clustered "blob" canopy (asymmetric) ───────────────────────
    trunkH = 2.2 + rng() * 1.6;
    canopyR = 1.3 + rng() * 0.7;
    const { trunk } = makeTrunk(palette, trunkH, rng);
    group.add(trunk);
    // A core blob plus a few offset satellites → lumpy, organic crown.
    const clumps = [
      { r: canopyR, x: 0, y: trunkH + canopyR * 0.5, z: 0 },
      { r: canopyR * 0.62, x: canopyR * 0.7, y: trunkH + canopyR * 0.9, z: canopyR * 0.2 },
      { r: canopyR * 0.55, x: -canopyR * 0.6, y: trunkH + canopyR * 0.8, z: -canopyR * 0.3 },
      { r: canopyR * 0.5, x: canopyR * 0.1, y: trunkH + canopyR * 1.3, z: -canopyR * 0.4 },
    ];
    for (const c of clumps) {
      const fg = new THREE.Group();
      fg.add(blob(foliageMat, c.r, rng));
      fg.position.set(
        c.x + (rng() - 0.5) * 0.3,
        c.y,
        c.z + (rng() - 0.5) * 0.3,
      );
      group.add(fg);
      foliageGroups.push(fg);
    }
  }

  return { group, foliageGroups, foliageMat, trunkH };
}

export class TreeField {
  constructor(scene, count = 8) {
    this.group = new THREE.Group();
    this._trees = [];
    const rng = mulberry32(0xb100);

    // Camera orbits at r ≈ 14; keep trees out on the border (19–32) so they
    // never cross in front of the central flower. Spread them evenly around the
    // ring with a little jitter to avoid a mechanical look.
    for (let i = 0; i < count; i++) {
      const palette = TREE_PALETTES[i % TREE_PALETTES.length];
      const { group, foliageGroups, foliageMat } = buildTree(palette, rng);

      const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const dist  = 19 + rng() * 13;
      group.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      group.rotation.y = rng() * Math.PI * 2;
      const s = 0.85 + rng() * 0.5;
      group.scale.setScalar(s);

      this.group.add(group);
      this._trees.push({
        group,
        foliageGroups,
        foliageMat,
        phase: rng() * Math.PI * 2,
        fade: 1,
      });
    }

    scene.add(this.group);

    // Scratch vectors reused by updateFade (no per-frame allocation).
    this._vCam = new THREE.Vector3();
    this._vTree = new THREE.Vector3();
    this._vTarget = new THREE.Vector3();
    this._vDir = new THREE.Vector3();
    this._vClosest = new THREE.Vector3();
    this._vRel = new THREE.Vector3();
  }

  update(time) {
    const t = time * 0.001;
    for (const tree of this._trees) {
      // Gentle trunk sway.
      tree.group.rotation.z = Math.sin(t * 0.6 + tree.phase) * 0.025;

      // Foliage sway — upper layers move a touch more.
      tree.foliageGroups.forEach((fg, i) => {
        fg.rotation.z = Math.sin(t * 0.8 + tree.phase + i * 0.5) * (0.02 + i * 0.012);
        fg.rotation.x = Math.sin(t * 0.5 + tree.phase + i * 0.3) * 0.012;
      });
    }
  }

  /**
   * Safety net so the hero flower is never obscured: if a tree sits close to the
   * line between the camera and the target (the flower), fade its foliage out.
   * Called each frame from GardenScene.
   * @param {THREE.Camera}  camera
   * @param {THREE.Vector3} target  point the camera looks at (the flower)
   */
  updateFade(camera, target) {
    this._vCam.copy(camera.position);
    this._vTarget.copy(target);
    this._vDir.copy(this._vTarget).sub(this._vCam);
    const segLen = this._vDir.length();
    if (segLen < 0.001) return;
    this._vDir.multiplyScalar(1 / segLen);

    for (const tree of this._trees) {
      tree.group.getWorldPosition(this._vTree);
      // Sample around canopy height.
      this._vTree.y = Math.max(this._vTree.y, 2.5);

      // Project tree centre onto the camera→target segment.
      this._vRel.copy(this._vTree).sub(this._vCam);
      const proj = this._vRel.dot(this._vDir);
      let desired = 1;
      if (proj > 0.5 && proj < segLen - 0.5) {
        this._vClosest.copy(this._vCam).addScaledVector(this._vDir, proj);
        const perp = this._vTree.distanceTo(this._vClosest);
        // Within a couple of units of the view line → fade proportionally.
        desired = THREE.MathUtils.clamp((perp - 1.6) / 1.8, 0.18, 1);
      }
      // Smoothly approach the desired opacity.
      tree.fade += (desired - tree.fade) * 0.12;
      tree.foliageMat.opacity = tree.fade;
    }
  }
}
