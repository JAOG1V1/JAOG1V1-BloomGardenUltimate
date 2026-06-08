import { describe, it, expect } from "vitest";
import { terrainHeight, terrainNormal, POND } from "../src/world/Terrain.js";

describe("Terrain height field", () => {
  it("keeps the hero-flower area essentially flat", () => {
    // The centre is flattened so the flower / energy disc never float or sink.
    expect(Math.abs(terrainHeight(0, 0))).toBeLessThan(0.05);
  });

  it("carves a real basin under the pond", () => {
    const pondFloor = terrainHeight(POND.x, POND.z);
    // The basin centre must sit clearly below the surrounding ground level…
    expect(pondFloor).toBeLessThan(-0.5);
    // …and below the resting water surface, so water reads as sitting in a hole.
    expect(pondFloor).toBeLessThan(POND.waterY);
  });

  it("returns finite heights across the playfield", () => {
    for (let x = -30; x <= 30; x += 7.5) {
      for (let z = -30; z <= 30; z += 7.5) {
        expect(Number.isFinite(terrainHeight(x, z))).toBe(true);
      }
    }
  });

  it("produces an upward unit surface normal", () => {
    const n = terrainNormal(0, 0);
    expect(n.y).toBeGreaterThan(0);
    expect(n.length()).toBeCloseTo(1, 5);
  });
});
