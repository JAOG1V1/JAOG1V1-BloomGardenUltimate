const SAVE_VERSION = 2;
const BASE_SPECIES = ["rose", "daisy", "tulip", "sunflower"];

export class SaveSystem {
  constructor(key = "bloom-garden-ultimate-v1") {
    this.key = key;
  }

  /** Default state for a new game (schema v2). */
  defaultState() {
    return {
      version: SAVE_VERSION,
      score: 0,
      sap: 0,
      energy: 0,
      level: 1,
      totalClicks: 0,
      createdAt: Date.now(),
      upgrades: { click: 0, energy: 0, bees: 0, species: 0, decor: 0 },
      unlockedSpecies: [...BASE_SPECIES],
      achievements: [],          // ids earned
      settings: { sound: true, lowQuality: false },
      stats: { powerupsCollected: 0, maxCombo: 0, sawFireflies: false },
    };
  }

  /** Bring an older save up to the current schema without losing progress. */
  _migrate(data) {
    const def = this.defaultState();
    const merged = { ...def, ...data };
    merged.upgrades = { ...def.upgrades, ...(data.upgrades || {}) };
    merged.settings = { ...def.settings, ...(data.settings || {}) };
    merged.stats    = { ...def.stats, ...(data.stats || {}) };
    if (!Array.isArray(merged.unlockedSpecies) || merged.unlockedSpecies.length === 0) {
      merged.unlockedSpecies = [...BASE_SPECIES];
    }
    if (!Array.isArray(merged.achievements)) merged.achievements = [];
    merged.version = SAVE_VERSION;
    return merged;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return this.defaultState();
      return this._migrate(JSON.parse(raw));
    } catch {
      return this.defaultState();
    }
  }

  /** True if a non-trivial save exists (used to show "Continuar"). */
  hasSave() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return (data.level || 1) > 1 || (data.score || 0) > 0 || (data.totalClicks || 0) > 0;
    } catch {
      return false;
    }
  }

  reset() {
    try { localStorage.removeItem(this.key); } catch { /* ignore */ }
    return this.defaultState();
  }

  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // Silently ignore storage errors (private mode, quota exceeded…)
    }
  }
}
