import * as THREE from "three";

/**
 * DayNightCycle — manages time of day (0 = midnight, 0.5 = noon, 1 = midnight).
 * Controls: ambient light, directional sun/moon lights, fog color,
 * and sky phase via SkyDome.setDayPhase(t).
 */

// Key-frame data: t, skyH, skyS, skyL, sunIntensity, ambIntensity, ambR, ambG, ambB
const PHASES = [
  { t: 0.00, skyH: 0.63, skyS: 0.52, skyL: 0.05, sunInt: 0.00, ambInt: 0.20, ar: 0.06, ag: 0.05, ab: 0.14 },
  { t: 0.20, skyH: 0.61, skyS: 0.55, skyL: 0.09, sunInt: 0.05, ambInt: 0.25, ar: 0.10, ag: 0.08, ab: 0.20 },
  { t: 0.26, skyH: 0.07, skyS: 0.88, skyL: 0.40, sunInt: 0.70, ambInt: 0.65, ar: 1.00, ag: 0.50, ab: 0.22 },
  { t: 0.34, skyH: 0.56, skyS: 0.76, skyL: 0.50, sunInt: 1.40, ambInt: 0.90, ar: 0.68, ag: 0.78, ab: 1.00 },
  { t: 0.50, skyH: 0.55, skyS: 0.85, skyL: 0.68, sunInt: 1.80, ambInt: 1.10, ar: 0.80, ag: 0.88, ab: 1.00 },
  { t: 0.66, skyH: 0.54, skyS: 0.78, skyL: 0.50, sunInt: 1.40, ambInt: 0.90, ar: 0.88, ag: 0.79, ab: 0.62 },
  { t: 0.74, skyH: 0.06, skyS: 0.92, skyL: 0.42, sunInt: 0.75, ambInt: 0.60, ar: 1.00, ag: 0.36, ab: 0.10 },
  { t: 0.82, skyH: 0.72, skyS: 0.62, skyL: 0.16, sunInt: 0.15, ambInt: 0.30, ar: 0.18, ag: 0.11, ab: 0.38 },
  { t: 1.00, skyH: 0.63, skyS: 0.52, skyL: 0.05, sunInt: 0.00, ambInt: 0.20, ar: 0.06, ag: 0.05, ab: 0.14 },
];

function lerpNum(a, b, t) { return a + (b - a) * t; }

function samplePhases(dayT) {
  // Find surrounding keyframes
  let a = PHASES[0], b = PHASES[PHASES.length - 1];
  for (let i = 0; i < PHASES.length - 1; i++) {
    if (dayT >= PHASES[i].t && dayT <= PHASES[i + 1].t) {
      a = PHASES[i];
      b = PHASES[i + 1];
      break;
    }
  }
  const f = a.t === b.t ? 0 : (dayT - a.t) / (b.t - a.t);
  return {
    skyH:   lerpNum(a.skyH, b.skyH, f),
    skyS:   lerpNum(a.skyS, b.skyS, f),
    skyL:   lerpNum(a.skyL, b.skyL, f),
    sunInt: lerpNum(a.sunInt, b.sunInt, f),
    ambInt: lerpNum(a.ambInt, b.ambInt, f),
    ar: lerpNum(a.ar, b.ar, f),
    ag: lerpNum(a.ag, b.ag, f),
    ab: lerpNum(a.ab, b.ab, f),
  };
}

export class DayNightCycle {
  /**
   * @param {THREE.Scene}           scene
   * @param {THREE.AmbientLight}    ambientLight
   * @param {object}                skyDome  — instance with setDayPhase(t) method
   * @param {THREE.Fog}             fog
   */
  constructor(scene, ambientLight, skyDome, fog) {
    this._ambient = ambientLight;
    this._sky     = skyDome;
    this._fog     = fog;

    // Directional sun light
    this.sunLight = new THREE.DirectionalLight(0xfff4e8, 1.8);
    this.sunLight.position.set(40, 60, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width  = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far  = 150;
    this.sunLight.shadow.camera.left = this.sunLight.shadow.camera.bottom = -30;
    this.sunLight.shadow.camera.right = this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.bias = -0.001;
    scene.add(this.sunLight);

    // Moon light (cool blue)
    this.moonLight = new THREE.DirectionalLight(0x9090ff, 0.0);
    this.moonLight.position.set(-30, 50, -10);
    scene.add(this.moonLight);

    // Internal time (0–1)
    this._dayT = 0.4; // start mid-morning
    this._speed = 0.000003; // full day/night cycle ≈ 5.5 min at 60 fps (delta ~16 ms → 25 000 steps)

    // Smooth manual transition state
    this._targetT = null;          // tween destination, or null when idle
    this._tweenRate = 0.00045;     // day-fraction per ms (worst case ~0.5 → ~1.1 s)

    this.nightFactor = 0; // exposed for FireflyField
  }

  /** Smoothly travel to a specific time of day (0–1) */
  setTime(t) {
    this._targetT = ((t % 1) + 1) % 1;
  }

  /** Smoothly toggle between night and day */
  toggleNight() {
    if (this._dayT > 0.3 && this._dayT < 0.7) {
      this.setTime(0.0); // glide to midnight
    } else {
      this.setTime(0.5); // glide to noon
    }
  }

  /** Current time 0–1 */
  get dayT() { return this._dayT; }

  /** Human-readable time string */
  get timeLabel() {
    const h = Math.floor(this._dayT * 24);
    const m = Math.floor(((this._dayT * 24) % 1) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  _applyPhase() {
    const p = samplePhases(this._dayT);

    // Sky
    this._sky.setSkyPhase(p.skyH, p.skyS, p.skyL);

    // Ambient
    this._ambient.color.setRGB(p.ar, p.ag, p.ab);
    this._ambient.intensity = p.ambInt;

    // Sun angle: rises in east (negative x), sets in west (positive x)
    const sunAngle = (this._dayT - 0.25) * Math.PI * 2;
    this.sunLight.position.set(
      Math.cos(sunAngle) * 60,
      Math.sin(sunAngle) * 60,
      20,
    );
    this.sunLight.intensity = p.sunInt;

    // Drive the visible sky sun (glow/halo) along the same arc.
    if (this._sky.setSun) {
      const sx = Math.cos(sunAngle), sy = Math.sin(sunAngle), sz = 0.32;
      const len = Math.hypot(sx, sy, sz) || 1;
      this._sky.setSun(sx / len, sy / len, sz / len, p.sunInt);
    }

    // Moon: opposite of sun
    this.moonLight.position.set(
      -Math.cos(sunAngle) * 50,
      -Math.abs(Math.sin(sunAngle)) * 50 + 20,
      -10,
    );
    const isNight = this._dayT < 0.2 || this._dayT > 0.82;
    this.moonLight.intensity = isNight ? lerpNum(0, 0.5, this.nightFactor) : 0;

    // Night factor (0=day, 1=full night)
    if (this._dayT < 0.22) {
      this.nightFactor = lerpNum(0, 1, (0.22 - this._dayT) / 0.22);
    } else if (this._dayT > 0.80) {
      this.nightFactor = lerpNum(0, 1, (this._dayT - 0.80) / 0.20);
    } else {
      this.nightFactor = 0;
    }

    // Fog colour: match the bright horizon haze so the ground melts into the
    // distant hills/sky instead of ending on a hard line. Warmer & lighter by
    // day, cool & dark at night.
    if (this._fog) {
      const fogL = Math.min(0.72, p.skyL * 0.95 + 0.05);
      this._fog.color.setHSL(p.skyH, p.skyS * 0.6, fogL);
    }
  }

  update(delta) {
    if (this._targetT !== null) {
      // Glide along the shortest path around the 0–1 clock toward the target.
      let diff = this._targetT - this._dayT;
      if (diff > 0.5) diff -= 1;
      if (diff < -0.5) diff += 1;

      const step = this._tweenRate * delta;
      if (Math.abs(diff) <= step) {
        this._dayT = this._targetT;
        this._targetT = null;
      } else {
        this._dayT = ((this._dayT + Math.sign(diff) * step) % 1 + 1) % 1;
      }
    } else {
      this._dayT = (this._dayT + this._speed * delta) % 1;
    }
    this._applyPhase();
  }
}
