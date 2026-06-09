import * as THREE from "three";

/**
 * Weather — an occasional, gentle weather cycle: long clear spells, then a soft
 * rain shower, then (by day) a fading rainbow. Deliberately a treat rather than
 * a constant, and only created on the desktop quality tier (see GardenScene), so
 * it never costs weak devices anything.
 *
 *  • Rain is a single LineSegments draw (thin falling streaks that recycle).
 *  • The rainbow is seven concentric half-ring arcs that fade in/out.
 */
export class Weather {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this._night = 0;
    this._state = "clear";
    this._timer = 40 + Math.random() * 90; // first shower is a while away

    this._rainOpacity = 0; this._rainTarget = 0;
    this._bowOpacity = 0;  this._bowTarget = 0;

    this._buildRain();
    this._buildRainbow();
  }

  _buildRain() {
    this._rainCount = 1400;
    this._rainLen = 0.6;
    this._area = { x: 24, z: 24, top: 18, bottom: -1 };

    const positions = new Float32Array(this._rainCount * 2 * 3);
    this._rainSpeed = new Float32Array(this._rainCount);
    for (let i = 0; i < this._rainCount; i++) {
      const x = (Math.random() - 0.5) * 2 * this._area.x;
      const z = (Math.random() - 0.5) * 2 * this._area.z;
      const y = Math.random() * this._area.top;
      positions[i * 6]     = x; positions[i * 6 + 1] = y;               positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x; positions[i * 6 + 4] = y - this._rainLen; positions[i * 6 + 5] = z;
      this._rainSpeed[i] = 14 + Math.random() * 10;
    }
    this._rainPos = positions;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this._rainGeo = geo;
    this._rainMat = new THREE.LineBasicMaterial({
      color: 0xbcd4ff, transparent: true, opacity: 0, depthWrite: false, fog: true,
    });
    this._rain = new THREE.LineSegments(geo, this._rainMat);
    this._rain.frustumCulled = false;
    this._rain.visible = false;
    this.group.add(this._rain);
  }

  _buildRainbow() {
    this._bow = new THREE.Group();
    const colors = [0xff5b5b, 0xffa84c, 0xffe14c, 0x7ed957, 0x4cc9ff, 0x4c6bff, 0x9b5bff];
    const baseR = 26;
    for (let i = 0; i < colors.length; i++) {
      const inner = baseR + i * 1.3;
      const geo = new THREE.RingGeometry(inner, inner + 1.3, 96, 1, 0, Math.PI);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i], transparent: true, opacity: 0, depthWrite: false,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      });
      this._bow.add(new THREE.Mesh(geo, mat));
    }
    this._bow.position.set(8, 1.0, -48);
    this._bow.visible = false;
    this.group.add(this._bow);
  }

  setNightFactor(f) { this._night = f; }

  update(_time, dt) {
    this._timer -= dt;
    if (this._timer <= 0) this._advance();

    // Ease rain + rainbow opacity toward their targets.
    this._rainOpacity += (this._rainTarget - this._rainOpacity) * Math.min(1, dt * 1.5);
    this._bowOpacity  += (this._bowTarget  - this._bowOpacity)  * Math.min(1, dt * 0.8);

    // Animate falling rain while it is (even faintly) visible.
    if (this._rainOpacity > 0.004 || this._rainTarget > 0) {
      this._rain.visible = true;
      const p = this._rainPos;
      for (let i = 0; i < this._rainCount; i++) {
        const dy = this._rainSpeed[i] * dt;
        p[i * 6 + 1] -= dy; p[i * 6 + 4] -= dy;
        if (p[i * 6 + 4] < this._area.bottom) {
          const x = (Math.random() - 0.5) * 2 * this._area.x;
          const z = (Math.random() - 0.5) * 2 * this._area.z;
          p[i * 6]     = x; p[i * 6 + 1] = this._area.top;               p[i * 6 + 2] = z;
          p[i * 6 + 3] = x; p[i * 6 + 4] = this._area.top - this._rainLen; p[i * 6 + 5] = z;
        }
      }
      this._rainGeo.attributes.position.needsUpdate = true;
      this._rainMat.opacity = this._rainOpacity * 0.5;
    } else {
      this._rain.visible = false;
    }

    // Rainbow fades out completely at night (needs sun).
    const bowVis = this._bowOpacity * (1 - this._night);
    this._bow.visible = bowVis > 0.005;
    if (this._bow.visible) {
      for (const m of this._bow.children) m.material.opacity = bowVis * 0.35;
    }
  }

  _advance() {
    if (this._state === "clear") {
      this._state = "rain"; this._rainTarget = 1;
      this._timer = 22 + Math.random() * 26;
    } else if (this._state === "rain") {
      this._rainTarget = 0;
      if (this._night < 0.4) { this._state = "rainbow"; this._bowTarget = 1; this._timer = 16 + Math.random() * 12; }
      else { this._state = "clear"; this._timer = 60 + Math.random() * 100; }
    } else { // rainbow
      this._state = "clear"; this._bowTarget = 0;
      this._timer = 60 + Math.random() * 120;
    }
  }
}
