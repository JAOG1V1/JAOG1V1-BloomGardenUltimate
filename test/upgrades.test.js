import { describe, it, expect } from "vitest";
import {
  UPGRADES, UPGRADE_BY_ID, LOCKED_SPECIES,
  upgradeLevel, upgradeCost, upgradeValue,
} from "../src/game/Upgrades.js";

describe("Upgrades", () => {
  it("indexes every upgrade by id", () => {
    for (const u of UPGRADES) expect(UPGRADE_BY_ID[u.id]).toBe(u);
  });

  it("reads the owned level, defaulting to 0", () => {
    expect(upgradeLevel({}, "click")).toBe(0);
    expect(upgradeLevel({ upgrades: {} }, "click")).toBe(0);
    expect(upgradeLevel({ upgrades: { click: 3 } }, "click")).toBe(3);
  });

  it("grows the cost geometrically with level", () => {
    const u = UPGRADE_BY_ID.click;
    expect(upgradeCost(u, 0)).toBe(u.baseCost);
    expect(upgradeCost(u, 1)).toBe(Math.floor(u.baseCost * u.growth));
    // Each level must cost strictly more than the previous one.
    for (let l = 1; l < u.max; l++) {
      expect(upgradeCost(u, l)).toBeGreaterThan(upgradeCost(u, l - 1));
    }
  });

  it("maps owned level to its gameplay value", () => {
    const s = { upgrades: { click: 2, bees: 5 } };
    expect(upgradeValue(s, "click")).toBe(UPGRADE_BY_ID.click.value(2));
    expect(upgradeValue(s, "bees")).toBe(UPGRADE_BY_ID.bees.value(5));
    expect(upgradeValue(s, "unknown")).toBe(0);
  });

  it("can unlock exactly the locked species through the species upgrade", () => {
    expect(UPGRADE_BY_ID.species.max).toBe(LOCKED_SPECIES.length);
  });
});
