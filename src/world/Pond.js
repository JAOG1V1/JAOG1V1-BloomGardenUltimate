import * as THREE from "three";
import { terrainHeight, POND } from "./Terrain.js";

/**
 * Pond — an animated water surface that sits INSIDE a real terrain basin.
 *
 * Bug fixes vs. the old version:
 *  • The water no longer reads as a flat disc laid on top of the ground: the
 *    terrain is carved into a bowl (see Terrain.js) and the water plane is set
 *    BELOW the surrounding rim (POND.waterY), so it looks like water in a hole.
 *  • z-fighting / the stray "red line" artefact at the shore is gone: the water
 *    uses polygonOffset and its edge tucks under the sloped bank.
 *  • The old floating torus "bank" (which hovered over the new relief) is
 *    replaced by natural margins — partly-submerged rocks and reeds that follow
 *    the actual terrain height around the rim.
 *
 * The pond GROUP is positioned at (POND.x, 0, POND.z) by GardenScene, so all
 * geometry here is authored in pond-local space.
 */
export class Pond {
  constructor(scene) {
    this.group = new THREE.Group();

    const RADIUS = POND.waterRadius;
    const SEGS   = 56;

    // ── Water surface ─────────────────────────────────────────────────────────
    const geo = new THREE.CircleGeometry(RADIUS, SEGS);
    this._waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a86c4,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.55,
      transparent: true,
      opacity: 0.86,
      reflectivity: 0.85,
      ior: 1.33,
      envMapIntensity: 1.35, // mirror the scene environment (sky) for a livelier surface
      emissive: new THREE.Color(0x06304f),
      emissiveIntensity: 0.08,
      side: THREE.DoubleSide,
    });
    // Render the water just behind opaque banks so the shoreline never z-fights.
    this._waterMat.polygonOffset = true;
    this._waterMat.polygonOffsetFactor = -1;
    this._waterMat.polygonOffsetUnits = -1;

    this._water = new THREE.Mesh(geo, this._waterMat);
    this._water.rotation.x = -Math.PI / 2;
    this._water.position.y = POND.waterY;
    this._water.receiveShadow = true;
    this._water.renderOrder = 1;
    this.group.add(this._water);

    // Store original vertex positions for ripple animation.
    this._origPos = geo.attributes.position.array.slice();
    this._posAttr = geo.attributes.position;

    // ── A dark basin floor below the water (so deep water reads opaque) ───────
    const floorGeo = new THREE.CircleGeometry(RADIUS * 1.02, SEGS);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x14361f, roughness: 1.0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = POND.waterY - POND.depth * 0.6;
    floor.receiveShadow = true;
    this.group.add(floor);

    // ── Ripple rings (decorative expanding circles on the surface) ───────────
    this._rings = [];
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.RingGeometry(0.2, 0.28, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xbfe8ff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = POND.waterY + 0.015;
      ring.renderOrder = 2;
      this.group.add(ring);
      this._rings.push({ mesh: ring, mat: ringMat, phase: (i / 3) * Math.PI * 2 });
    }

    // ── Natural margins: partly-submerged rocks + reeds around the rim ───────
    this._buildShore();

    // Water sparkle light.
    this._sparkle = new THREE.PointLight(0x80ccff, 0.4, 9);
    this._sparkle.position.y = 1.6;
    this.group.add(this._sparkle);

    // ── Water lilies (lily pads, some with a little flower) ──────────────────
    this._lilies = this._buildLilies(RADIUS);

    scene.add(this.group);
  }

  /** Local terrain height at a pond-local (lx, lz) point. */
  _localGround(lx, lz) {
    return terrainHeight(POND.x + lx, POND.z + lz);
  }

  /** Rocks and reeds that ring the shore, each sat on the real bank height. */
  _buildShore() {
    const rockMatBase = { roughness: 0.95, metalness: 0.02, flatShading: true };
    const rockColors = [0x7a7468, 0x6a6a60, 0x857c66, 0x6f7560];
    const rockCount = 14;
    for (let i = 0; i < rockCount; i++) {
      const a = (i / rockCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const rr = POND.radius * (0.96 + Math.random() * 0.22);
      const lx = Math.cos(a) * rr;
      const lz = Math.sin(a) * rr;
      const s = 0.22 + Math.random() * 0.4;

      const geo = new THREE.IcosahedronGeometry(1, 0);
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        pos.setXYZ(j,
          pos.getX(j) + (Math.random() - 0.5) * 0.3,
          pos.getY(j) + (Math.random() - 0.5) * 0.2,
          pos.getZ(j) + (Math.random() - 0.5) * 0.3);
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: rockColors[i % rockColors.length], ...rockMatBase });
      const rock = new THREE.Mesh(geo, mat);
      rock.scale.set(s, s * 0.7, s);
      rock.rotation.set(Math.random(), Math.random() * Math.PI * 2, Math.random());
      rock.position.set(lx, this._localGround(lx, lz) + s * 0.18, lz);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
    }

    const reedMat = new THREE.MeshStandardMaterial({
      color: 0x4f7a2e, roughness: 0.85, side: THREE.DoubleSide, flatShading: true,
    });
    const reedGeo = makeReedGeometry();
    const clusters = 9;
    for (let c = 0; c < clusters; c++) {
      const a = Math.random() * Math.PI * 2;
      const rr = POND.radius * (0.9 + Math.random() * 0.18);
      const cx = Math.cos(a) * rr;
      const cz = Math.sin(a) * rr;
      const n = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) {
        const lx = cx + (Math.random() - 0.5) * 0.5;
        const lz = cz + (Math.random() - 0.5) * 0.5;
        const reed = new THREE.Mesh(reedGeo, reedMat);
        const h = 0.7 + Math.random() * 0.9;
        reed.scale.set(0.8 + Math.random() * 0.5, h, 0.8 + Math.random() * 0.5);
        reed.rotation.y = Math.random() * Math.PI * 2;
        reed.rotation.z = (Math.random() - 0.5) * 0.2;
        reed.position.set(lx, this._localGround(lx, lz) - 0.05, lz);
        reed.castShadow = true;
        this.group.add(reed);
      }
    }
  }

  /** A flat lily pad (notched disc) with an optional small flower on top. */
  _buildLilyPad(radius, withFlower) {
    const pad = new THREE.Group();

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
      const pad = this._buildLilyPad(r, i % 2 === 0);
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * (pondRadius - r - 0.9);
      pad.position.set(Math.cos(ang) * dist, POND.waterY, Math.sin(ang) * dist);
      pad.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(pad);
      lilies.push({
        pad,
        baseY: POND.waterY,
        phase: Math.random() * Math.PI * 2,
        drift: 0.15 + Math.random() * 0.2,
      });
    }
    return lilies;
  }

  update(time) {
    const t = time * 0.001;

    const pos = this._posAttr;
    const orig = this._origPos;
    const R = POND.waterRadius;
    for (let i = 0; i < pos.count; i++) {
      const ox = orig[i * 3];
      const oz = orig[i * 3 + 2];
      const dist = Math.sqrt(ox * ox + oz * oz);
      pos.setZ(i, Math.sin(dist * 1.8 - t * 2.5) * 0.04 * (1 - dist / R));
    }
    pos.needsUpdate = true;
    this._water.geometry.computeVertexNormals();

    this._waterMat.emissiveIntensity = 0.05 + Math.sin(t * 1.2) * 0.04;
    this._sparkle.intensity = 0.3 + Math.sin(t * 2.5) * 0.15;

    for (const r of this._rings) {
      const s = (Math.sin(t * 0.8 + r.phase) + 1) * 0.5;
      r.mesh.scale.setScalar(0.5 + s * 3.0);
      r.mat.opacity = Math.max(0, (1 - s) * 0.3);
    }

    for (const l of this._lilies) {
      l.pad.position.y = l.baseY + Math.sin(t * 0.9 + l.phase) * 0.03;
      l.pad.rotation.z = Math.sin(t * l.drift + l.phase) * 0.04;
      l.pad.rotation.x = Math.cos(t * l.drift * 0.8 + l.phase) * 0.04;
    }
  }
}

/** A thin tapered reed/rush blade (single double-sided strip). */
function makeReedGeometry() {
  const positions = [];
  const indices = [];
  const w = 0.05, h = 1.0, segs = 4;
  for (let s = 0; s <= segs; s++) {
    const f = s / segs;
    const y = f * h;
    const ww = w * (1 - f * 0.8);
    positions.push(-ww, y, 0, ww, y, 0);
  }
  for (let s = 0; s < segs; s++) {
    const a = s * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
