// Achievement definitions. `check(state, ctx)` returns true once earned.
// ctx carries transient run info (maxCombo, sawFireflies, powerupsCollected…).

export const ACHIEVEMENTS = [
  { id: "firstBloom", icon: "🌱", name: "Primeiro Broto",
    desc: "Energize a flor pela primeira vez.",
    check: (s) => s.totalClicks >= 1 },
  { id: "level5", icon: "🌿", name: "Jardim Florescente",
    desc: "Alcance o nível 5.",
    check: (s) => s.level >= 5 },
  { id: "level10", icon: "🌳", name: "Mestre Jardineiro",
    desc: "Alcance o nível 10.",
    check: (s) => s.level >= 10 },
  { id: "combo5", icon: "🔥", name: "Em Chamas",
    desc: "Atinja um combo de x5.",
    check: (s, c) => (c.maxCombo || s.stats.maxCombo || 0) >= 5 },
  { id: "collector", icon: "🎁", name: "Colecionador",
    desc: "Colete 10 power-ups.",
    check: (s) => (s.stats.powerupsCollected || 0) >= 10 },
  { id: "botanist", icon: "🌷", name: "Botânico",
    desc: "Desbloqueie todas as 7 espécies.",
    check: (s) => (s.unlockedSpecies || []).length >= 7 },
  { id: "nightOwl", icon: "✨", name: "Coruja da Noite",
    desc: "Veja os vagalumes à noite.",
    check: (s) => !!s.stats.sawFireflies },
  { id: "rich", icon: "💰", name: "Tesouro do Jardim",
    desc: "Acumule 10.000 pontos.",
    check: (s) => s.score >= 10000 },
];
