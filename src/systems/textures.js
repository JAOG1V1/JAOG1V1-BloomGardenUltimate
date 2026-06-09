import * as THREE from "three";

/**
 * Shared procedural canvas textures. Generating them once and caching keeps the
 * look consistent and avoids re-uploading identical textures to the GPU.
 */

let _softCircle = null;
let _glowDisc = null;
let _cloud = null;
let _skyEnv = null;

/**
 * A soft, radial circular sprite — used to replace the default square GL points
 * so floating particles read as gentle dots of light instead of hard pixels.
 */
export function softCircleTexture() {
  if (_softCircle) return _softCircle;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.85)");
  g.addColorStop(0.7, "rgba(255,255,255,0.25)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  _softCircle = new THREE.CanvasTexture(canvas);
  _softCircle.colorSpace = THREE.SRGBColorSpace;
  return _softCircle;
}

/**
 * A wide, soft radial glow used for the magical energy ring on the ground —
 * a filled disc that fades to transparent, so there is no hard hole in the
 * middle.
 */
export function glowDiscTexture() {
  if (_glowDisc) return _glowDisc;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.18, "rgba(255,255,255,0.55)");
  g.addColorStop(0.42, "rgba(255,255,255,0.28)");
  // A subtle brighter band gives the disc a ring-like aura without a void.
  g.addColorStop(0.62, "rgba(255,255,255,0.42)");
  g.addColorStop(0.8, "rgba(255,255,255,0.12)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glowDisc = new THREE.CanvasTexture(canvas);
  _glowDisc.colorSpace = THREE.SRGBColorSpace;
  return _glowDisc;
}

/**
 * A fluffy, stylised cloud puff (several overlapping soft blobs) with a soft
 * alpha edge. Tinted per-instance via the sprite/material colour.
 */
export function cloudTexture() {
  if (_cloud) return _cloud;
  const w = 256, h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // A handful of overlapping radial blobs forms a soft cumulus silhouette.
  const blobs = [
    { x: 0.50, y: 0.62, r: 0.32 },
    { x: 0.34, y: 0.66, r: 0.24 },
    { x: 0.66, y: 0.66, r: 0.26 },
    { x: 0.42, y: 0.50, r: 0.22 },
    { x: 0.60, y: 0.52, r: 0.20 },
    { x: 0.24, y: 0.70, r: 0.16 },
    { x: 0.78, y: 0.70, r: 0.17 },
  ];
  for (const b of blobs) {
    const cx = b.x * w, cy = b.y * h, r = b.r * w;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0.0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.5, "rgba(255,255,255,0.45)");
    g.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  _cloud = new THREE.CanvasTexture(canvas);
  _cloud.colorSpace = THREE.SRGBColorSpace;
  return _cloud;
}

/**
 * A soft equirectangular sky gradient used to build the scene's environment map
 * (IBL). It is intentionally a calm, neutral daytime gradient — zenith blue →
 * warm horizon → soft green ground — so it adds gentle sky-tinted reflections to
 * the water and a coherent sheen to every PBR material, without trying to match
 * the live sky (the day/night lights already handle colour; the scene only dials
 * its environmentIntensity down at night).
 */
export function skyEnvEquirectTexture() {
  if (_skyEnv) return _skyEnv;
  const w = 256, h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, "#274a8c");  // zenith
  g.addColorStop(0.45, "#9fc2ef"); // upper sky
  g.addColorStop(0.5, "#dfe9f5");  // horizon haze
  g.addColorStop(0.55, "#cdd8c2"); // just below horizon
  g.addColorStop(1.0, "#3c5a39");  // ground bounce
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  _skyEnv = new THREE.CanvasTexture(canvas);
  _skyEnv.colorSpace = THREE.SRGBColorSpace;
  _skyEnv.mapping = THREE.EquirectangularReflectionMapping;
  return _skyEnv;
}
