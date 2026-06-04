import * as THREE from "three";
import { softCircleTexture } from "./textures.js";

/**
 * ParticleField — ambient magical motes.
 *
 * Rendered as TWO layers so the glow varies in size *and* brightness instead of
 * being a uniform wall of bright dots:
 *   • dust    — many, tiny, faint, desaturated → soft atmosphere
 *   • sparkle — few, larger, vivid, additive   → the occasional magical twinkle
 *
 * Densities are deliberately low and opacities gentle so that even with the
 * "Decoração Mágica" bloom turned up the scene stays pretty rather than busy.
 */
export class ParticleField {
  constructor(count = 420) {
    // Split the budget: most motes are faint dust, a minority are bright sparkles.
    const dustCount    = Math.round(count * 0.68);
    const sparkleCount = Math.max(1, count - dustCount);

    this.group = new THREE.Group();

    const palette = [
      new THREE.Color(0xff8bd0),
      new THREE.Color(0xffd166),
      new THREE.Color(0x7ef0b5),
      new THREE.Color(0xc084fc),
      new THREE.Color(0x8bdcff),
    ];
    const tex = softCircleTexture();
    this._tex = tex;

    // Build one points layer; `bright` controls colour intensity per layer.
    const buildLayer = (n, { size, opacity, bright, sway }) => {
      const positions = new Float32Array(n * 3);
      const colors    = new Float32Array(n * 3);
      const phases    = new Float32Array(n);

      for (let i = 0; i < n; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 70;
        positions[i * 3 + 1] = Math.random() * 22 - 1;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

        const c = palette[Math.floor(Math.random() * palette.length)].clone();
        // Per-particle brightness variation keeps the field from looking uniform.
        const b = bright * (0.55 + Math.random() * 0.65);
        colors[i * 3]     = c.r * b;
        colors[i * 3 + 1] = c.g * b;
        colors[i * 3 + 2] = c.b * b;

        phases[i] = Math.random() * Math.PI * 2;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        vertexColors: true,
        map: tex,
        alphaMap: tex,
        size,
        transparent: true,
        opacity,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geo, mat);
      this.group.add(points);
      return { points, positions, phases, n, sway };
    };

    this._layers = [
      // Dust: small, faint, calm — the soft magical haze.
      buildLayer(dustCount, { size: 0.18, opacity: 0.32, bright: 0.55, sway: 0.0008 }),
      // Sparkle: bigger, vivid, fewer — the eye-catching twinkles.
      buildLayer(sparkleCount, { size: 0.42, opacity: 0.5, bright: 1.0, sway: 0.0014 }),
    ];

    // Kept for backward compatibility (GardenScene adds `points` to the scene).
    this.points = this.group;
  }

  update(time) {
    const t = time * 0.001;
    for (const layer of this._layers) {
      const pos = layer.positions;
      for (let i = 0; i < layer.n; i++) {
        const ph = layer.phases[i];
        // Gentle upward drift with a soft sinusoidal sway.
        pos[i * 3 + 1] += 0.004 + Math.sin(t + ph) * 0.0018;
        pos[i * 3]     += Math.cos(t * 0.4 + ph) * layer.sway;

        if (pos[i * 3 + 1] > 22) {
          pos[i * 3 + 1] = -1;
          pos[i * 3]     = (Math.random() - 0.5) * 70;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
      }
      layer.points.geometry.attributes.position.needsUpdate = true;
    }

    this.group.rotation.y = time * 0.000022;
  }
}
