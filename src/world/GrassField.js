import * as THREE from "three";
import { terrainHeight, POND } from "./Terrain.js";

/**
 * GrassField — dense instanced grass with tapered, slightly curved blades,
 * a base→tip colour gradient and GPU wind sway (animated in the vertex shader,
 * so there is no per-frame CPU matrix rebuild). Each blade is two crossed quads
 * so it keeps volume from any angle instead of vanishing edge-on.
 */
export class GrassField {
  constructor(scene, count = 1800) {
    this._count = count;

    const geo = makeBladeGeometry(0.07, 0.55, 4);

    // Wind uniforms shared with the patched standard material. uGust (0..1) is
    // driven from the scene so passing gusts visibly lean and ripple the grass.
    this._uTime = { value: 0 };
    this._uGust = { value: 0 };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this._uTime;
      shader.uniforms.uGust = this._uGust;
      shader.vertexShader = "uniform float uTime;\nuniform float uGust;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         // Bend the blade more toward the tip (vertex height), driven by world XZ.
         vec4 wPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float bendK = position.y * position.y * 1.4;
         float w = sin(uTime * 1.6 + wPos.x * 0.5 + wPos.z * 0.35);
         float w2 = sin(uTime * 2.3 + wPos.z * 0.6);
         float gust = 1.0 + uGust * 1.4;
         transformed.x += w * bendK * 0.5 * gust;
         transformed.z += w2 * bendK * 0.3 * gust;
         // A passing gust also leans the whole blade one way.
         transformed.x += uGust * bendK * 0.9;`
      );
    };

    this._mesh = new THREE.InstancedMesh(geo, mat, count);
    this._mesh.castShadow = false;
    this._mesh.receiveShadow = true;
    this._mesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    const baseCol = new THREE.Color();

    let w = 0; // write index (resample so the pond never leaves identity blades)
    for (let i = 0; i < count; i++) {
      // Disc distribution biased toward the centre meadow; resample if it lands
      // in the pond so we don't sprout blades through the water surface.
      let x = 0, z = 0;
      for (let tries = 0; tries < 6; tries++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = 1.5 + Math.pow(Math.random(), 0.7) * 24;
        x = Math.cos(angle) * dist;
        z = Math.sin(angle) * dist;
        if (Math.hypot(x - POND.x, z - POND.z) > POND.radius * 0.95) break;
      }

      dummy.position.set(x, terrainHeight(x, z), z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.rotation.z = (Math.random() - 0.5) * 0.25; // natural lean
      const h = 0.7 + Math.random() * 0.9;
      dummy.scale.set(0.8 + Math.random() * 0.5, h, 0.8 + Math.random() * 0.5);
      dummy.updateMatrix();
      this._mesh.setMatrixAt(w, dummy.matrix);

      // Per-blade green tone variation.
      baseCol.setHSL(0.33 - Math.random() * 0.06, 0.55 + Math.random() * 0.2, 0.32 + Math.random() * 0.12);
      this._mesh.setColorAt(w, baseCol);
      w++;
    }
    this._mesh.count = w;
    this._mesh.instanceMatrix.needsUpdate = true;
    if (this._mesh.instanceColor) this._mesh.instanceColor.needsUpdate = true;

    scene.add(this._mesh);
  }

  update(time) {
    this._uTime.value = time * 0.001;
  }

  /** Set the current gust strength (0..1), driven by the scene's wind. */
  setGust(g) {
    this._uGust.value = g;
  }
}

/**
 * Two crossed, tapered blades merged into one geometry. Base at y=0, narrowing
 * toward the tip, with a vertical colour gradient baked into vertex colours.
 */
function makeBladeGeometry(width, height, segments) {
  const positions = [];
  const colors = [];
  const indices = [];
  const baseColor = new THREE.Color(0x1f6e34);
  const tipColor  = new THREE.Color(0x6fd06a);
  const c = new THREE.Color();

  const addQuad = (rot) => {
    const start = positions.length / 3;
    for (let s = 0; s <= segments; s++) {
      const f = s / segments;
      const y = f * height;
      const w = width * (1 - f * 0.85); // taper to a point
      const cx = Math.cos(rot), sx = Math.sin(rot);
      for (const sign of [-1, 1]) {
        const lx = sign * w;
        positions.push(lx * cx, y, lx * sx);
        c.copy(baseColor).lerp(tipColor, f);
        colors.push(c.r, c.g, c.b);
      }
    }
    for (let s = 0; s < segments; s++) {
      const a = start + s * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };

  addQuad(0);
  addQuad(Math.PI / 2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
