import * as THREE from "three";

const FIREFLY_COLORS = [0x80ff80, 0xffff60, 0x60ffb0, 0xc0ff80, 0xffff80];

/** Build a soft radial-gradient glow texture (shared by every firefly sprite). */
function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.85)");
  g.addColorStop(0.6, "rgba(255,255,255,0.25)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * FireflyField — glowing night fireflies rendered as additive sprites instead of
 * per-firefly PointLights. WebGL handles many dynamic lights poorly, so we fake
 * the glow with emissive sprites (cheap) plus at most one shared point light.
 */
export class FireflyField {
  constructor(scene, count = 18) {
    this._scene = scene;
    this._fireflies = [];

    // Shared resources (disposed once on teardown).
    this._tex = makeGlowTexture();
    this._materials = [];

    for (let i = 0; i < count; i++) {
      const color = FIREFLY_COLORS[i % FIREFLY_COLORS.length];

      // One material per colour, reused across same-colour sprites.
      let mat = this._materials[i % FIREFLY_COLORS.length];
      if (!mat) {
        mat = new THREE.SpriteMaterial({
          map: this._tex,
          color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        });
        this._materials[i % FIREFLY_COLORS.length] = mat;
      }

      // Per-sprite material clone so each can blink independently.
      const sprite = new THREE.Sprite(mat.clone());
      sprite.scale.setScalar(0.55);

      const cx = (Math.random() - 0.5) * 20;
      const cz = (Math.random() - 0.5) * 16;
      const cy = 0.5 + Math.random() * 2.5;
      sprite.position.set(cx, cy, cz);
      sprite.visible = false;
      scene.add(sprite);

      this._fireflies.push({
        sprite,
        mat: sprite.material,
        cx, cy, cz,
        speed:  0.2 + Math.random() * 0.4,
        radius: 1.0 + Math.random() * 2.5,
        phase:  Math.random() * Math.PI * 2,
        blinkPhase: Math.random() * Math.PI * 2,
      });
    }

    // A single shared warm light gently lifts the night scene where fireflies
    // gather (far cheaper than one light per firefly).
    this._sharedLight = new THREE.PointLight(0xbfff9a, 0, 22);
    this._sharedLight.position.set(0, 2.5, 0);
    scene.add(this._sharedLight);

    this._nightIntensity = 0; // 0=day, 1=night
  }

  /** Called by DayNightCycle; nightFactor 0→1 */
  setNightFactor(f) {
    this._nightIntensity = f;
  }

  update(time) {
    const t = time * 0.001;
    const visible = this._nightIntensity > 0.1;
    this._sharedLight.intensity = this._nightIntensity * 0.5;

    for (const f of this._fireflies) {
      f.sprite.visible = visible;
      if (!visible) continue;

      const angle = t * f.speed + f.phase;
      f.sprite.position.set(
        f.cx + Math.cos(angle) * f.radius,
        f.cy + Math.sin(angle * 1.3) * 0.5,
        f.cz + Math.sin(angle) * f.radius * 0.7,
      );

      // Blink: fake the glow via sprite opacity + scale.
      const blink = Math.max(0, Math.sin(t * 3 + f.blinkPhase));
      const intensity = this._nightIntensity * blink;
      f.mat.opacity = intensity;
      f.sprite.scale.setScalar(0.4 + intensity * 0.35);
    }
  }

  /** Release GPU resources */
  dispose() {
    for (const f of this._fireflies) {
      this._scene.remove(f.sprite);
      f.mat.dispose();
    }
    this._materials.forEach(m => m && m.dispose());
    this._tex.dispose();
    this._scene.remove(this._sharedLight);
    this._fireflies.length = 0;
  }
}
