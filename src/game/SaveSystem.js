export class SaveSystem {
  constructor(key = "bloom-garden-ultimate-v1") {
    this.key = key;
  }

  /** Default state for a new game */
  defaultState() {
    return {
      score: 0,
      sap: 0,
      energy: 0,
      level: 1,
      totalClicks: 0,
      createdAt: Date.now()
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return this.defaultState();
      return { ...this.defaultState(), ...JSON.parse(raw) };
    } catch {
      return this.defaultState();
    }
  }

  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // Silently ignore storage errors (e.g. private mode, quota exceeded)
    }
  }
}
