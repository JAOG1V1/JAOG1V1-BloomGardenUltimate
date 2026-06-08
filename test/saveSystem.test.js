import { describe, it, expect } from "vitest";
import { SaveSystem } from "../src/game/SaveSystem.js";

const save = new SaveSystem();

describe("SaveSystem schema", () => {
  it("provides a complete default state", () => {
    const d = save.defaultState();
    expect(d.level).toBe(1);
    expect(d.score).toBe(0);
    expect(d.unlockedSpecies).toEqual(["rose", "daisy", "tulip", "sunflower"]);
    expect(d.settings).toMatchObject({ sound: true, lowQuality: false });
    expect(d.upgrades).toMatchObject({ click: 0, energy: 0, bees: 0, species: 0, decor: 0 });
  });

  it("migrates an old/partial save without losing progress", () => {
    const old = { score: 4200, level: 7, upgrades: { click: 3 } };
    const m = save._migrate(old);
    expect(m.score).toBe(4200);
    expect(m.level).toBe(7);
    // Missing fields are filled from defaults…
    expect(m.upgrades.click).toBe(3);
    expect(m.upgrades.bees).toBe(0);
    expect(m.settings.sound).toBe(true);
    expect(m.stats.tutorialDone).toBe(false);
    // …and the version is bumped to the current schema.
    expect(m.version).toBeGreaterThanOrEqual(2);
  });

  it("repairs corrupt collections instead of trusting them", () => {
    const m = save._migrate({ unlockedSpecies: "not-an-array", achievements: null });
    expect(Array.isArray(m.unlockedSpecies)).toBe(true);
    expect(m.unlockedSpecies.length).toBeGreaterThan(0);
    expect(Array.isArray(m.achievements)).toBe(true);
  });

  it("keeps a non-empty unlocked species list", () => {
    const m = save._migrate({ unlockedSpecies: [] });
    expect(m.unlockedSpecies.length).toBeGreaterThan(0);
  });
});
