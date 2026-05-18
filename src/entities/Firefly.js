import * as THREE from "three";

const FIREFLY_COLORS = [0x80ff80, 0xffff60, 0x60ffb0, 0xc0ff80, 0xffff80];

export class FireflyField {
  constructor(scene, count = 20) {
    this._scene = scene;
    this._fireflies = [];

    for (let i = 0; i < count; i++) {
      const color = FIREFLY_COLORS[i % FIREFLY_COLORS.length];

      // Tiny glowing sphere
      const geo = new THREE.SphereGeometry(0.06, 8, 8);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: 1.5,
        roughness: 0.0,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // Point light on each firefly
      const light = new THREE.PointLight(color, 0.0, 6);
      mesh.add(light);

      const cx = (Math.random() - 0.5) * 20;
      const cz = (Math.random() - 0.5) * 16;
      const cy = 0.5 + Math.random() * 2.5;

      mesh.position.set(cx, cy, cz);
      scene.add(mesh);

      this._fireflies.push({
        mesh,
        mat,
        light,
        cx, cy, cz,
        speed:  0.2 + Math.random() * 0.4,
        radius: 1.0 + Math.random() * 2.5,
        phase:  Math.random() * Math.PI * 2,
        blinkPhase: Math.random() * Math.PI * 2,
      });
    }

    this._nightIntensity = 0; // 0=day, 1=night
  }

  /** Called by DayNightCycle; nightFactor 0→1 */
  setNightFactor(f) {
    this._nightIntensity = f;
  }

  update(time) {
    const t = time * 0.001;
    for (const f of this._fireflies) {
      const angle = t * f.speed + f.phase;
      f.mesh.position.set(
        f.cx + Math.cos(angle) * f.radius,
        f.cy + Math.sin(angle * 1.3) * 0.5,
        f.cz + Math.sin(angle) * f.radius * 0.7,
      );

      // Blink effect
      const blink = Math.max(0, Math.sin(t * 3 + f.blinkPhase));
      const intensity = this._nightIntensity * blink;
      f.mat.emissiveIntensity = intensity * 1.5;
      f.light.intensity = intensity * 1.2;

      // Hide mesh during day
      f.mesh.visible = this._nightIntensity > 0.1;
    }
  }
}
