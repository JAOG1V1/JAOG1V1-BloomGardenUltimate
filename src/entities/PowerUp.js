import * as THREE from "three";

/** Power-up kinds. `night` ones only spawn after dark. */
export const POWERUP_KINDS = {
  butterfly: { emoji: "🦋", color: 0xffd45f, label: "Borboleta Dourada" },
  rain:      { emoji: "🌧️", color: 0x8bd3ff, label: "Nuvem de Chuva" },
  mushroom:  { emoji: "🍄", color: 0xff6b6b, label: "Cogumelo Mágico" },
  fireflies: { emoji: "✨", color: 0xbfff7a, label: "Enxame de Vagalumes", night: true },
};

function emojiTexture(emoji) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.font = `${size * 0.7}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.4, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * PowerUpField — spawns clickable floating power-ups in the 3D scene with a
 * spawn cooldown, and expires uncollected ones. Each power-up is a glow sprite
 * (additive → blooms) plus an emoji sprite so it reads clearly from any angle.
 */
export class PowerUpField {
  constructor(scene, camera) {
    this._scene = scene;
    this._camera = camera;
    this._group = new THREE.Group();
    scene.add(this._group);

    this._glowTex = glowTexture();
    this._emojiTex = {};
    for (const k of Object.keys(POWERUP_KINDS)) {
      this._emojiTex[k] = emojiTexture(POWERUP_KINDS[k].emoji);
    }

    this._active = [];
    this._cooldown = 6;     // seconds until first spawn
    this._spawnEvery = 11;  // base seconds between spawns
    this._maxActive = 2;
    this._lastTime = 0;
    this._nightFactor = 0;
  }

  setNightFactor(f) { this._nightFactor = f; }

  _spawn() {
    const pool = Object.keys(POWERUP_KINDS).filter(k => {
      const def = POWERUP_KINDS[k];
      return def.night ? this._nightFactor > 0.4 : true;
    });
    const kind = pool[Math.floor(Math.random() * pool.length)];
    const def = POWERUP_KINDS[kind];

    const group = new THREE.Group();

    const glowMat = new THREE.SpriteMaterial({
      map: this._glowTex, color: def.color, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(1.8);
    group.add(glow);

    const emojiMat = new THREE.SpriteMaterial({ map: this._emojiTex[kind], transparent: true, depthWrite: false, fog: false });
    const emoji = new THREE.Sprite(emojiMat);
    emoji.scale.setScalar(1.1);
    group.add(emoji);

    const angle = Math.random() * Math.PI * 2;
    const dist = 4 + Math.random() * 7;
    group.position.set(Math.cos(angle) * dist, 1.6 + Math.random() * 2.2, Math.sin(angle) * dist * 0.7);

    this._group.add(group);
    this._active.push({ kind, group, glow, emoji, life: 13, born: this._lastTime, baseY: group.position.y });
  }

  /** Raycast against active power-ups; collects + returns the kind, or null. */
  raycast(raycaster) {
    for (let i = 0; i < this._active.length; i++) {
      const p = this._active[i];
      const hits = raycaster.intersectObject(p.group, true);
      if (hits.length > 0) {
        this._remove(i);
        return p.kind;
      }
    }
    return null;
  }

  _remove(i) {
    const p = this._active[i];
    this._group.remove(p.group);
    p.glow.material.dispose();
    p.emoji.material.dispose();
    this._active.splice(i, 1);
  }

  update(time) {
    const t = time * 0.001;
    const dt = this._lastTime ? Math.min(t - this._lastTime, 0.1) : 0;
    this._lastTime = t;

    // Spawn timer
    this._cooldown -= dt;
    if (this._cooldown <= 0 && this._active.length < this._maxActive) {
      this._spawn();
      this._cooldown = this._spawnEvery + Math.random() * 6;
    }

    // Animate + expire
    for (let i = this._active.length - 1; i >= 0; i--) {
      const p = this._active[i];
      p.life -= dt;
      if (p.life <= 0) { this._remove(i); continue; }
      p.group.position.y = p.baseY + Math.sin(t * 2 + i) * 0.25;
      const pulse = 0.7 + Math.sin(t * 4 + i) * 0.25;
      p.glow.material.opacity = pulse * Math.min(1, p.life / 2); // fade out as it expires
      p.glow.scale.setScalar(1.6 + Math.sin(t * 4 + i) * 0.2);
    }
  }

  dispose() {
    for (let i = this._active.length - 1; i >= 0; i--) this._remove(i);
    this._scene.remove(this._group);
    this._glowTex.dispose();
    Object.values(this._emojiTex).forEach(t => t.dispose());
  }
}
