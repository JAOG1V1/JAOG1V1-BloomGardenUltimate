// Shop upgrade definitions. Each upgrade has a level stored in state.upgrades.
// `value(level)` returns the gameplay effect for a given owned level.

// Species unlocked in order by the "Nova Espécie" upgrade.
export const LOCKED_SPECIES = ["lotus", "bluebell", "orchid"];

export const UPGRADES = [
  {
    id: "click", icon: "👆", name: "Clique Poderoso",
    desc: "Aumenta os pontos ganhos por clique na flor.",
    currency: "score", baseCost: 50, growth: 1.6, max: 12,
    value: (lvl) => lvl * 3, // bonus points per click
  },
  {
    id: "energy", icon: "⚡", name: "Fonte de Energia",
    desc: "A energia regenera mais rápido e decai menos.",
    currency: "score", baseCost: 80, growth: 1.7, max: 8,
    value: (lvl) => lvl,
  },
  {
    id: "bees", icon: "🐝", name: "Abelhas Coletoras",
    desc: "Geração passiva de seiva, mesmo sem clicar.",
    currency: "sap", baseCost: 60, growth: 1.7, max: 12,
    value: (lvl) => lvl * 0.6, // sap per second
  },
  {
    id: "species", icon: "🌷", name: "Nova Espécie",
    desc: "Desbloqueia e planta uma nova espécie de flor.",
    currency: "sap", baseCost: 180, growth: 2.2, max: LOCKED_SPECIES.length,
    value: (lvl) => lvl,
  },
  {
    id: "decor", icon: "🪄", name: "Decoração Mágica",
    desc: "Intensifica o brilho e as partículas mágicas.",
    currency: "score", baseCost: 120, growth: 1.8, max: 5,
    value: (lvl) => lvl,
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

export function upgradeLevel(state, id) {
  return (state.upgrades && state.upgrades[id]) || 0;
}

export function upgradeCost(u, level) {
  return Math.floor(u.baseCost * Math.pow(u.growth, level));
}

/** Convenience: current gameplay value for an upgrade id. */
export function upgradeValue(state, id) {
  const u = UPGRADE_BY_ID[id];
  return u ? u.value(upgradeLevel(state, id)) : 0;
}
