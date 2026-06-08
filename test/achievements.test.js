import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS } from "../src/game/Achievements.js";

const byId = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

// A complete, valid state object the check() functions can read from.
function state(over = {}) {
  return {
    score: 0, level: 1, totalClicks: 0,
    unlockedSpecies: ["rose", "daisy", "tulip", "sunflower"],
    stats: { powerupsCollected: 0, maxCombo: 0, sawFireflies: false },
    ...over,
  };
}

describe("Achievements", () => {
  it("has unique ids and well-formed entries", () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.name).toBe("string");
      expect(typeof a.check).toBe("function");
    }
  });

  it("firstBloom triggers on the first click", () => {
    expect(byId.firstBloom.check(state({ totalClicks: 0 }))).toBe(false);
    expect(byId.firstBloom.check(state({ totalClicks: 1 }))).toBe(true);
  });

  it("level milestones trigger at the right level", () => {
    expect(byId.level5.check(state({ level: 4 }))).toBe(false);
    expect(byId.level5.check(state({ level: 5 }))).toBe(true);
    expect(byId.level10.check(state({ level: 10 }))).toBe(true);
  });

  it("combo5 reads from the transient context or saved max", () => {
    expect(byId.combo5.check(state(), { maxCombo: 5 })).toBe(true);
    expect(byId.combo5.check(state({ stats: { maxCombo: 6 } }), {})).toBe(true);
    expect(byId.combo5.check(state(), { maxCombo: 4 })).toBe(false);
  });

  it("botanist needs all seven species", () => {
    expect(byId.botanist.check(state())).toBe(false);
    const all = ["rose", "daisy", "tulip", "sunflower", "lotus", "bluebell", "orchid"];
    expect(byId.botanist.check(state({ unlockedSpecies: all }))).toBe(true);
  });

  it("rich needs ten thousand points", () => {
    expect(byId.rich.check(state({ score: 9999 }))).toBe(false);
    expect(byId.rich.check(state({ score: 10000 }))).toBe(true);
  });
});
