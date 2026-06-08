import { describe, it, expect } from "vitest";
import { samplePhases } from "../src/world/DayNightCycle.js";

describe("DayNightCycle.samplePhases", () => {
  it("returns every channel the cycle needs", () => {
    const p = samplePhases(0.5);
    for (const k of ["skyH", "skyS", "skyL", "sunInt", "ambInt", "ar", "ag", "ab"]) {
      expect(typeof p[k]).toBe("number");
      expect(Number.isFinite(p[k])).toBe(true);
    }
  });

  it("matches the keyframes exactly at midnight and noon", () => {
    expect(samplePhases(0).skyL).toBeCloseTo(0.05, 5); // darkest
    expect(samplePhases(0.5).sunInt).toBeCloseTo(1.8, 5); // brightest sun
  });

  it("the sun is brightest around midday and off at night", () => {
    expect(samplePhases(0.5).sunInt).toBeGreaterThan(samplePhases(0.0).sunInt);
    expect(samplePhases(0.0).sunInt).toBeCloseTo(0, 5);
  });

  it("interpolates smoothly between keyframes", () => {
    // 0.42 sits between the 0.34 (1.40) and 0.50 (1.80) sun keyframes.
    const mid = samplePhases(0.42).sunInt;
    expect(mid).toBeGreaterThan(1.4);
    expect(mid).toBeLessThan(1.8);
  });

  it("is stable for any time in [0,1]", () => {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const p = samplePhases(t);
      expect(p.skyL).toBeGreaterThanOrEqual(0);
      expect(p.ambInt).toBeGreaterThan(0);
    }
  });
});
