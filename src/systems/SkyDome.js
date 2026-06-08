import * as THREE from "three";
import { cloudTexture } from "./textures.js";

/**
 * SkyDome — an atmospheric sky built from cheap techniques:
 *   • a gradient sky sphere (shader): warm/light near the horizon, saturated up
 *     top, recoloured across the full day/night cycle;
 *   • a glowing sun (day) and moon + stars + aurora bands (night);
 *   • drifting stylised clouds (soft sprites) tinted by the time of day;
 *   • distant low-poly hill silhouettes that fade into the fog for depth and to
 *     soften the hard ground/sky horizon line.
 *
 * Public API (used by DayNightCycle): setSkyPhase(h,s,l), setSun(dir, int),
 * update(time).
 */
export class SkyDome {
  constructor() {
    this.group = new THREE.Group();

    this._topColor     = new THREE.Color(0x2a1a6e);
    this._horizonColor = new THREE.Color(0x9fb8e0);
    this._nightF       = 0;

    // Reusable colours for setSkyPhase (runs every frame) — avoids allocating a
    // handful of THREE.Color objects per frame just to recolour sky/clouds.
    this._warmColor   = new THREE.Color(0xffb066); // sunrise/sunset warm tint
    this._cloudWhite  = new THREE.Color(0xffffff);
    this._cloudNight  = new THREE.Color(0x2a3458);
    this._cloudTint   = new THREE.Color();

    this._buildSky();
    this._buildHills();
    this._buildClouds();
    this._buildSun();
    this._buildStars();
    this._buildMoon();
    this._buildAurora();

    // Current phase (set by DayNightCycle)
    this._skyH = 0.63;
    this._skyS = 0.52;
    this._skyL = 0.05;
  }

  // ── Gradient sky sphere ────────────────────────────────────────────────────
  _buildSky() {
    const skyGeo = new THREE.SphereGeometry(95, 32, 24);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor:     { value: this._topColor },
        horizonColor: { value: this._horizonColor },
        offset:       { value: 8.0 },
        exponent:     { value: 0.7 },
      },
      vertexShader: /* glsl */`
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          float f = pow(clamp(h, 0.0, 1.0), exponent);
          gl_FragColor = vec4(mix(horizonColor, topColor, f), 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(skyGeo, this.skyMat);
    this.group.add(this.sky);
  }

  // ── Distant hill silhouettes (atmospheric perspective via fog) ─────────────
  _buildHills() {
    this._hillLayers = [];
    // Two concentric rings of low rolling hills. The farther ring is lighter and
    // bluer so it reads as more distant; both fade into the fog at the horizon.
    const layers = [
      { radius: 58, height: 6.5, color: 0x3f6b4a, segs: 64, y: -2.0 },
      { radius: 72, height: 9.0, color: 0x6f93b8, segs: 72, y: -2.5 },
    ];
    for (const L of layers) {
      const geo = this._hillRingGeometry(L.radius, L.height, L.segs);
      const mat = new THREE.MeshBasicMaterial({
        color: L.color,
        side: THREE.DoubleSide,
        fog: true, // fades into the horizon haze
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = L.y;
      this.group.add(mesh);
      this._hillLayers.push({ mesh, mat, baseColor: new THREE.Color(L.color) });
    }
  }

  /** A wavy silhouette band: a ring whose top edge rolls up and down. */
  _hillRingGeometry(radius, height, segs) {
    const positions = [];
    const indices = [];
    let seed = radius * 13.37;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const tops = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const roll = (Math.sin(a * 3 + radius) * 0.5 + Math.sin(a * 7 + 1.3) * 0.3 + rnd() * 0.4) * 0.5 + 0.5;
      tops.push(height * (0.45 + roll * 0.55));
    }
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      positions.push(x, -4, z);          // bottom (below horizon)
      positions.push(x, tops[i], z);     // top
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ── Drifting stylised clouds ───────────────────────────────────────────────
  _buildClouds() {
    this.clouds = [];
    const tex = cloudTexture();
    const count = 14;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        fog: false,
      });
      const sprite = new THREE.Sprite(mat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 26;
      const y = 15 + Math.random() * 17;
      sprite.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
      const w = 24 + Math.random() * 26;
      sprite.scale.set(w, w * 0.48, 1);
      this.group.add(sprite);
      this.clouds.push({
        sprite, mat,
        angle, dist, y,
        baseW: w,
        speed: 0.000004 + Math.random() * 0.000006,
        baseOpacity: 0.45 + Math.random() * 0.35,
      });
    }
  }

  // ── Sun: bright core + soft halo (additive so it blooms) ───────────────────
  _buildSun() {
    this.sunGroup = new THREE.Group();

    const haloMat = new THREE.SpriteMaterial({
      map: this._radialSprite(),
      color: 0xfff0c0,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this._sunHalo = new THREE.Sprite(haloMat);
    this._sunHalo.scale.setScalar(34);
    this.sunGroup.add(this._sunHalo);

    const coreMat = new THREE.SpriteMaterial({
      map: this._radialSprite(),
      color: 0xfff6e0,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this._sunCore = new THREE.Sprite(coreMat);
    this._sunCore.scale.setScalar(12);
    this.sunGroup.add(this._sunCore);

    this.sunGroup.position.set(40, 60, -40);
    this.group.add(this.sunGroup);
  }

  _radialSprite() {
    if (this._radTex) return this._radTex;
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.7)");
    g.addColorStop(0.6, "rgba(255,255,255,0.18)");
    g.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    this._radTex = new THREE.CanvasTexture(canvas);
    this._radTex.colorSpace = THREE.SRGBColorSpace;
    return this._radTex;
  }

  _buildStars() {
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1) * 0.5; // upper hemisphere
      const r     = 88;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.abs(Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this._starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.34, transparent: true, opacity: 0.0, depthWrite: false, fog: false });
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

    // Soft moon glow
    const glowMat = new THREE.SpriteMaterial({
      map: this._radialSprite(), color: 0xcfd8ff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    this._moonGlow = new THREE.Sprite(glowMat);
    this._moonGlow.scale.setScalar(14);
    this.moon.add(this._moonGlow);
  }

  _buildAurora() {
    this.bands = [];
    const bandColors = [0xff8ed8, 0x8bdcff, 0xd0a0ff, 0xffd166, 0xa8edea];
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.PlaneGeometry(30 + i * 4, 5 + Math.random() * 4);
      const mat = new THREE.MeshBasicMaterial({
        color: bandColors[i % bandColors.length],
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 22, 26 + Math.random() * 12, -40 - i * 2.5);
      mesh.rotation.x = -0.3 - Math.random() * 0.2;
      this.group.add(mesh);
      this.bands.push({ mesh, speed: 0.0002 + Math.random() * 0.0003, phase: Math.random() * Math.PI * 2, baseOpacity: 0.04 + Math.random() * 0.03 });
    }
  }

  /**
   * Called by DayNightCycle each frame with the base sky HSL.
   * Derives a saturated top colour and a lighter, hazier horizon colour, then
   * recolours the gradient, clouds and distant hills to match.
   */
  setSkyPhase(h, s, l) {
    this._skyH = h;
    this._skyS = s;
    this._skyL = l;

    // Night factor: how dark is the sky
    const nightF = Math.max(0, 1 - l / 0.35);
    this._nightF = nightF;

    // Gradient colours. Lift the top saturation a touch for a vibrant zenith.
    this._topColor.setHSL(h, Math.min(1, s * 1.12), l);
    // Horizon is lighter and a little less saturated → atmospheric haze, but
    // deliberately NOT pushed toward white (keeps the sky from reading milky).
    const horizonL = Math.min(0.72, l * 1.0 + 0.06);
    const horizonS = s * (0.62 + nightF * 0.2);
    this._horizonColor.setHSL(h, horizonS, horizonL);

    // Warm the horizon a touch toward sunrise/sunset (mid lightness, warm hues).
    const warmF = Math.max(0, 1 - Math.abs(l - 0.42) / 0.2) * (h < 0.18 || h > 0.66 ? 1 : 0.25);
    if (warmF > 0) {
      this._horizonColor.lerp(this._warmColor, warmF * 0.5);
    }

    // Stars + moon + aurora at night.
    this._starMat.opacity = Math.min(0.9, nightF * 1.2);
    this.moon.visible = nightF > 0.1;
    this._moonMat.emissiveIntensity = nightF * 0.6;
    this._moonGlow.material.opacity = nightF * 0.5;
    this.bands.forEach(b => { b.mesh.material.opacity = b.baseOpacity * nightF; });

    // Clouds: tinted toward the horizon colour, brighter by day, dim at night.
    const cloudTint = this._cloudTint.copy(this._horizonColor).lerp(this._cloudWhite, 0.42 * (1 - nightF));
    cloudTint.lerp(this._cloudNight, nightF * 0.7);
    const cloudVis = 1 - nightF * 0.7;
    this.clouds.forEach(c => {
      c.mat.color.copy(cloudTint);
      c.mat.opacity = c.baseOpacity * cloudVis;
    });

    // Distant hills: keep more of their own colour so the silhouettes stay
    // defined; only a gentle blend toward the horizon haze for depth.
    this._hillLayers.forEach((H, idx) => {
      const blend = idx === 0 ? 0.3 : 0.55;
      H.mat.color.copy(H.baseColor).lerp(this._horizonColor, blend);
    });
  }

  /**
   * Position + brightness of the daytime sun. `dir` is a (roughly) normalised
   * direction toward the sun; `intensity` follows the sun light strength.
   */
  setSun(dirX, dirY, dirZ, intensity) {
    const r = 80;
    this.sunGroup.position.set(dirX * r, dirY * r, dirZ * r);
    // Fade out as the sun dips below the horizon or at night.
    const above = Math.max(0, Math.min(1, dirY * 3));
    const vis = above * Math.min(1, intensity);
    this._sunCore.material.opacity = vis * 0.95;
    this._sunHalo.material.opacity = vis * 0.55;
    // Warmer, larger halo when low on the horizon (sunrise/sunset).
    const low = 1 - Math.min(1, Math.max(0, dirY * 2.5));
    this._sunHalo.material.color.setHSL(0.09 + 0.02 * (1 - low), 0.85, 0.6 + 0.1 * (1 - low));
    this._sunHalo.scale.setScalar(30 + low * 22);
  }

  update(time) {
    // Drift clouds slowly around the dome, gentle vertical bob.
    this.clouds.forEach(c => {
      c.angle += c.speed * 16;
      c.sprite.position.x = Math.cos(c.angle) * c.dist;
      c.sprite.position.z = Math.sin(c.angle) * c.dist;
      c.sprite.position.y = c.y + Math.sin(time * 0.0002 + c.angle * 3) * 1.2;
    });

    // Animate aurora bands.
    this.bands.forEach(({ mesh, speed, phase }) => {
      mesh.position.x = Math.sin(time * speed + phase) * 8;
    });

    // Slowly rotate stars and moon.
    this.stars.rotation.y = time * 0.000018;
    this.moon.rotation.y  = time * 0.00001;
  }
}
