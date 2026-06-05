import { GardenScene } from "../scenes/GardenScene.js";
import { SaveSystem }  from "./SaveSystem.js";
import { UI }          from "./UI.js";
import { Sound }       from "./Sound.js";
import { ACHIEVEMENTS } from "./Achievements.js";
import {
  UPGRADE_BY_ID, LOCKED_SPECIES,
  upgradeLevel, upgradeCost, upgradeValue,
} from "./Upgrades.js";
import { SPECIES } from "../systems/FlowerSpecies.js";
import { POWERUP_KINDS } from "../entities/PowerUp.js";

// ── Economy tuning ───────────────────────────────────────────────────────────
// The loop reads as: click → ENERGY, ENERGY → SEIVA (sap), SEIVA → NÍVEL,
// and both clicks and energy feed the permanent PONTOS (score).
const SAVE_INTERVAL_MS   = 10_000; // auto-save cadence
const ENERGY_DECAY_PER_S = 1.4;    // energy lost per second
const ENERGY_PASSIVE_PER_S = 0.2;  // gentle passive trickle (depth)
const ENERGY_CLICK       = 14;     // energy gained per click
const SAP_PER_S          = 3.0;    // sap/sec at full energy (level 1)
const SCORE_PER_S        = 2.0;    // passive score/sec at full energy (level 1)
const SCORE_PER_CLICK    = 5;      // immediate score per click (× level)
const LEVEL_SAP_BASE     = 120;    // sap to reach the next level (× level)
const LEVEL_GROWTH_RATE  = 0.15;   // growth speed gained per level

// ── Combo tuning ─────────────────────────────────────────────────────────────
const COMBO_WINDOW_S   = 1.4;      // time before the combo decays
const COMBO_PER_TIER   = 4;        // quick clicks needed per +1 multiplier
const COMBO_MAX        = 8;        // multiplier cap

// ── Power-up tuning ──────────────────────────────────────────────────────────
const BUTTERFLY_S = 30;            // butterfly: ×2 energy per click
const RAIN_S      = 12;            // rain: auto-click duration
const RAIN_TICK_S = 0.45;          // auto-click cadence

/**
 * Game — root class that wires together the scene, UI, save system, sound,
 * combo, power-ups, shop and achievements.
 */
export class Game {
  constructor(canvas) {
    this._canvas = canvas;
    this._save   = new SaveSystem();
    this._ui     = new UI();
    this._scene  = null; // created after menu start

    this._state = this._save.load();
    this._sound = new Sound(!this._state.settings.sound);

    this._lastSave = 0;
    this._running  = false;
    this._lastTime = 0;

    // Combo state
    this._comboHits  = 0;
    this._comboTimer = 0;
    this._comboMult  = 1;

    // Active timed power-ups (seconds remaining)
    this._fx = { butterfly: 0, rain: 0 };
    this._rainAccum = 0;

    this._setup();
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  _setup() {
    const s = this._state;
    const hasSave = this._save.hasSave();

    this._ui.setMenuVisible(true);
    this._ui.showSaveInfo(s, hasSave);
    this._ui.setSoundIcon(this._sound.muted);
    this._ui.setSettingSound(s.settings.sound);
    this._ui.setSettingQuality(s.settings.lowQuality);
    this._ui.bindPanels();

    // ── Menu buttons ──────────────────────────────────────────────────────────
    this._ui.bindStart(() => this._startGame(!hasSave)); // "Novo Jogo" when no save
    this._ui.bindContinue(() => this._startGame(false));
    this._ui.bindMenuActions({
      onSettings: () => this._ui.openPanel("settings"),
      onCredits:  () => this._ui.openPanel("credits"),
      onHowto:    () => this._ui.openPanel("howto"),
    });

    // "Refazer tutorial" from the How-to-play panel.
    this._ui.bindHowtoTutorial(() => { this._ui.closePanel(); this._startTutorial(true); });

    // ── Settings (work from the menu too) ─────────────────────────────────────
    this._ui.bindSettings({
      onSound:   () => this._toggleSound(),
      onQuality: () => this._toggleQuality(),
      onReset:   () => this._resetProgress(),
    });

    // Persist progress when the tab is closed or hidden (mobile-safe).
    this._persist = () => this._save.save(this._state);
    window.addEventListener("beforeunload", this._persist);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this._persist();
    });
  }

  _startGame(fresh) {
    if (fresh) {
      this._state = this._save.reset();
      this._sound.setMuted(!this._state.settings.sound);
    }

    this._sound.resume();
    if (this._state.settings.sound) this._sound.startAmbient();

    // Smooth fade out of the menu into the loading screen.
    this._ui.fade(true);
    this._ui.setMenuVisible(false);
    this._ui.setLoadingVisible(true);
    this._ui.setMessage("Clique na flor para energizar o jardim ✨");

    // Defer the (synchronous, heavy) scene build by two frames so the browser
    // paints the loading overlay first — no black/frozen screen.
    requestAnimationFrame(() => requestAnimationFrame(() => this._buildScene()));
  }

  _buildScene() {
    const s = this._state;

    // Build Three.js scene with the player's unlocked species + quality choice.
    this._scene = new GardenScene(this._canvas, {
      unlocked: s.unlockedSpecies,
      lowQuality: s.settings.lowQuality,
    });
    this._scene.setBloomBoost(upgradeValue(s, "decor"));

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(document.documentElement);
    this._onResize();

    // Pointer interaction: distinguish a tap (energize/collect) from a camera
    // drag handled by OrbitControls. We record where the pointer went down and
    // only treat it as a click if it barely moved and was released quickly.
    this._canvas.addEventListener("pointerdown", e => {
      this._ptr = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    });
    this._canvas.addEventListener("pointerup", e => {
      const p = this._ptr;
      this._ptr = null;
      if (!p || p.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      const dt = performance.now() - p.t;
      if (moved <= 8 && dt <= 400) this._onPointer(e); // genuine tap
    });

    // Action buttons
    this._ui.bindDayNightToggle(() => { if (this._scene) this._scene.toggleDayNight(); });
    this._ui.bindShopButton(() => this._openShop());
    this._ui.bindCollectionButton(() => this._openCollection());
    this._ui.bindSoundButton(() => this._toggleSound());
    this._ui.bindHelpButton(() => this._ui.openPanel("howto"));
    this._ui.bindPhotoMode(null);

    // On-screen hint the first time each kind of power-up appears.
    this._powerupHinted = {};
    this._scene.powerups.onSpawn = (kind) => this._onPowerUpSpawn(kind);

    // First render, then reveal the world.
    this._scene.update(performance.now());
    this._ui.setInGame(true);
    this._ui.setLoadingVisible(false);
    this._ui.fade(false);

    // Welcome toast only AFTER entering (never on the menu).
    this._ui.toast("🌸 Bem-vindo ao seu jardim!");

    // First-time players get a short guided tutorial explaining the loop.
    if (!this._state.stats.tutorialDone) {
      this._startTutorial(false);
    }

    // Start loop
    this._running = true;
    this._lastTime = performance.now();
    requestAnimationFrame(t => this._loop(t));
  }

  /** Show the guided onboarding tutorial; `force` replays it even if seen. */
  _startTutorial(force) {
    if (!force && this._state.stats.tutorialDone) return;
    const steps = [
      { emoji: "🌸", title: "Bem-vindo ao Bloom Garden!",
        text: "Você cultiva um jardim mágico vivo. Vou te mostrar como ele funciona em poucos passos." },
      { emoji: "👆", title: "Energize a flor",
        text: "Clique (ou toque) na grande flor do centro para enchê-la de Energia ⚡. A energia cai devagar, então continue clicando!" },
      { emoji: "💧", title: "Energia vira Seiva",
        text: "Com a flor energizada, o jardim produz Seiva 💧 sozinho. Junte seiva para subir de Nível 🌿 e tudo floresce mais rápido." },
      { emoji: "⭐", title: "Pontos & Loja",
        text: "Clicar e manter o jardim ativo rende Pontos ⭐. Gaste-os na Loja 🛒 em upgrades: clique mais forte, abelhas, novas espécies e mais." },
      { emoji: "🎁", title: "Power-ups & ciclo dia/noite",
        text: "Itens brilhantes aparecem no jardim — clique para coletar bônus! No botão 🌙 você alterna dia e noite, quando surgem vagalumes." },
      { emoji: "❔", title: "Pronto para florescer!",
        text: "Pode reabrir este guia a qualquer momento no botão ❔. Bom cultivo! 🌱" },
    ];
    this._ui.showTutorial(steps, () => {
      this._state.stats.tutorialDone = true;
      this._save.save(this._state);
    });
  }

  /** First-time on-screen hint describing a power-up when it appears. */
  _onPowerUpSpawn(kind) {
    if (this._powerupHinted[kind]) return;
    this._powerupHinted[kind] = true;
    const hints = {
      butterfly: "🦋 Borboleta Dourada apareceu! Clique nela: dobra a energia por clique.",
      rain:      "🌧️ Nuvem de Chuva! Clique nela: auto-clica a flor por alguns segundos.",
      mushroom:  "🍄 Cogumelo Mágico! Clique nele: explosão instantânea de seiva.",
      fireflies: "✨ Enxame de Vagalumes! Clique nele: grande bônus de pontos.",
    };
    if (hints[kind]) this._ui.toast(hints[kind]);
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  _loop(time) {
    if (!this._running) return;
    requestAnimationFrame(t => this._loop(t));

    const dt = Math.min(time - this._lastTime, 100); // cap at 100 ms to avoid spirals
    this._lastTime = time;

    this._update(dt, time);
    this._scene.update(time);

    // Auto-save
    if (time - this._lastSave > SAVE_INTERVAL_MS) {
      this._save.save(this._state);
      this._lastSave = time;
    }
  }

  /** Sap required to reach the next level */
  _sapReq() {
    return LEVEL_SAP_BASE * this._state.level;
  }

  /** Progress 0–1 toward the next level */
  _levelProgress() {
    return this._state.sap / this._sapReq();
  }

  _update(dt, time) {
    const s    = this._state;
    const dt_s = dt / 1000;
    const lvlMul = 1 + (s.level - 1) * LEVEL_GROWTH_RATE; // higher level → faster growth

    // ── Combo decay ───────────────────────────────────────────────────────────
    if (this._comboMult > 1) {
      this._comboTimer -= dt_s;
      if (this._comboTimer <= 0) {
        this._comboHits = 0;
        this._comboMult = 1;
        this._ui.hideCombo();
      } else {
        this._ui.setCombo(this._comboMult, this._comboTimer / COMBO_WINDOW_S);
      }
    }

    // ── Timed power-ups ───────────────────────────────────────────────────────
    let fxChanged = false;
    for (const k of Object.keys(this._fx)) {
      if (this._fx[k] > 0) {
        this._fx[k] = Math.max(0, this._fx[k] - dt_s);
        fxChanged = true;
      }
    }
    if (this._fx.rain > 0) {
      this._rainAccum += dt_s;
      while (this._rainAccum >= RAIN_TICK_S) {
        this._rainAccum -= RAIN_TICK_S;
        this._autoClick();
      }
    }
    if (fxChanged) this._refreshPowerupBadges();

    // ── Energy: passive trickle up, steady decay down (energy upgrade slows it).
    const energyLvl = upgradeValue(s, "energy");
    s.energy += (ENERGY_PASSIVE_PER_S + energyLvl * 0.15) * dt_s;
    const decay = Math.max(0.4, ENERGY_DECAY_PER_S - energyLvl * 0.12);
    s.energy  = Math.max(0, Math.min(100, s.energy - decay * dt_s));

    const energyFrac = s.energy / 100;

    // ── Energy → seiva (sap) and permanent pontos (score). Bees add passive sap.
    const beeSap = upgradeValue(s, "bees");
    s.sap   += (SAP_PER_S * energyFrac * lvlMul + beeSap) * dt_s;
    s.score += SCORE_PER_S * energyFrac * lvlMul * dt_s;

    // ── Seiva → nível (spend sap to grow the garden a level).
    let leveled = false;
    while (s.sap >= this._sapReq()) {
      s.sap -= this._sapReq();
      s.level += 1;
      leveled = true;
    }
    if (leveled) {
      this._save.save(s); // persist milestones immediately
      this._ui.setMessage(`🌟 Nível ${s.level} alcançado! O jardim floresce mais forte!`);
      this._ui.toast(`🌟 Nível ${s.level}!`);
      this._sound.levelUp();
      if (this._scene) this._scene.energize();
      this._checkAchievements();
    }

    this._ui.setHUD(s, this._levelProgress());

    // ── Time display + night fireflies bonus ──────────────────────────────────
    if (this._scene) {
      this._ui.setTimeLabel(this._scene.timeLabel);
      const night = this._scene.nightFactor;
      if (night > 0.6) {
        if (!s.stats.sawFireflies) {
          s.stats.sawFireflies = true;
          this._checkAchievements();
        }
        // Gentle night-time score bonus from the fireflies.
        s.score += 0.8 * lvlMul * dt_s;
      }
    }
  }

  // ── Interaction ──────────────────────────────────────────────────────────

  _onPointer(e) {
    if (!this._scene) return;
    const rect = this._canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = this._scene.handlePointer(x, y, rect.width, rect.height);
    if (!hit) return;

    if (hit.type === "powerup") {
      this._collectPowerUp(hit.kind, e.clientX, e.clientY);
      return;
    }

    // Flower click
    this._registerCombo();
    const s = this._state;
    const energyGain = ENERGY_CLICK * (this._fx.butterfly > 0 ? 2 : 1);
    s.energy = Math.min(100, s.energy + energyGain);
    s.totalClicks++;

    // Immediate score reward (scales with level, click upgrade and combo).
    const base = SCORE_PER_CLICK * s.level + upgradeValue(s, "click");
    const gain = Math.round(base * this._comboMult);
    s.score += gain;

    this._ui.floatText(e.clientX, e.clientY, `+${gain}`, this._comboMult > 1 ? "combo" : "");
    this._ui.setHUD(s, this._levelProgress());
    this._sound.click();
    this._checkAchievements();
  }

  /** A simulated click from the Rain power-up (no combo, no sound spam). */
  _autoClick() {
    const s = this._state;
    s.energy = Math.min(100, s.energy + ENERGY_CLICK);
    s.totalClicks++;
    s.score += SCORE_PER_CLICK * s.level + upgradeValue(s, "click");
    this._ui.setHUD(s, this._levelProgress());
    if (this._scene) this._scene.energize();
  }

  _registerCombo() {
    this._comboHits++;
    this._comboTimer = COMBO_WINDOW_S;
    const mult = Math.min(1 + Math.floor(this._comboHits / COMBO_PER_TIER), COMBO_MAX);
    if (mult !== this._comboMult) {
      this._comboMult = mult;
      this._ui.bumpCombo();
    }
    this._state.stats.maxCombo = Math.max(this._state.stats.maxCombo || 0, this._comboMult);
    if (this._comboMult > 1) this._ui.setCombo(this._comboMult, 1);
  }

  // ── Power-ups ──────────────────────────────────────────────────────────────

  _collectPowerUp(kind, sx, sy) {
    const s = this._state;
    s.stats.powerupsCollected = (s.stats.powerupsCollected || 0) + 1;
    this._sound.collect();
    const def = POWERUP_KINDS[kind];

    switch (kind) {
      case "butterfly":
        this._fx.butterfly = BUTTERFLY_S;
        this._ui.toast(`${def.emoji} Borboleta Dourada — energia dobrada por ${BUTTERFLY_S}s!`);
        break;
      case "rain":
        this._fx.rain = RAIN_S;
        this._ui.toast(`${def.emoji} Nuvem de Chuva — auto-clique por ${RAIN_S}s!`);
        break;
      case "mushroom": {
        const burst = Math.round(this._sapReq() * 0.4 + 30);
        s.sap += burst;
        this._ui.floatText(sx, sy, `+${burst} 💧`, "combo");
        this._ui.toast(`${def.emoji} Cogumelo Mágico — explosão de seiva!`);
        if (this._scene) this._scene.energize();
        break;
      }
      case "fireflies": {
        const bonus = 150 * s.level;
        s.score += bonus;
        s.stats.sawFireflies = true;
        this._ui.floatText(sx, sy, `+${bonus} ⭐`, "combo");
        this._ui.toast(`${def.emoji} Enxame de Vagalumes — bônus de pontos!`);
        break;
      }
    }

    this._refreshPowerupBadges();
    this._ui.setHUD(s, this._levelProgress());
    this._checkAchievements();
  }

  _refreshPowerupBadges() {
    const list = [];
    if (this._fx.butterfly > 0) list.push({ icon: POWERUP_KINDS.butterfly.emoji, time: this._fx.butterfly });
    if (this._fx.rain > 0)      list.push({ icon: POWERUP_KINDS.rain.emoji, time: this._fx.rain });
    this._ui.setPowerups(list);
  }

  // ── Shop ─────────────────────────────────────────────────────────────────

  _openShop() {
    this._ui.renderShop(this._state, id => this._buyUpgrade(id));
    this._ui.openPanel("shop");
  }

  _buyUpgrade(id) {
    const s = this._state;
    const u = UPGRADE_BY_ID[id];
    const lvl = upgradeLevel(s, id);
    if (lvl >= u.max) return;
    const cost = upgradeCost(u, lvl);

    if (u.currency === "sap") {
      if (s.sap < cost) return;
      s.sap -= cost;
    } else {
      if (s.score < cost) return;
      s.score -= cost;
    }

    s.upgrades[id] = lvl + 1;
    this._sound.collect();

    // Apply side-effects for upgrades that change the scene immediately.
    if (id === "species") this._unlockNextSpecies();
    if (id === "decor" && this._scene) this._scene.setBloomBoost(upgradeValue(s, "decor"));

    this._save.save(s);
    this._ui.renderShop(s, uid => this._buyUpgrade(uid));
    this._ui.setHUD(s, this._levelProgress());
    this._checkAchievements();
  }

  _unlockNextSpecies() {
    const s = this._state;
    const next = LOCKED_SPECIES.find(id => !s.unlockedSpecies.includes(id));
    if (!next) return;
    s.unlockedSpecies.push(next);
    if (this._scene && this._scene.flowers) this._scene.flowers.unlockSpecies(next);
    const sp = SPECIES.find(x => x.id === next);
    if (sp) this._ui.toast(`${sp.emoji} Nova espécie desbloqueada: ${sp.name}!`);
  }

  // ── Collection ─────────────────────────────────────────────────────────────

  _openCollection() {
    this._ui.renderCollection(this._state);
    this._ui.openPanel("collection");
  }

  // ── Achievements ───────────────────────────────────────────────────────────

  _checkAchievements() {
    const s = this._state;
    const ctx = { maxCombo: this._comboMult };
    for (const a of ACHIEVEMENTS) {
      if (s.achievements.includes(a.id)) continue;
      if (a.check(s, ctx)) {
        s.achievements.push(a.id);
        this._ui.toast(`🏆 Conquista: ${a.name}!`);
        this._sound.levelUp();
      }
    }
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  _toggleSound() {
    const s = this._state;
    s.settings.sound = !s.settings.sound;
    this._sound.setMuted(!s.settings.sound);
    if (s.settings.sound) { this._sound.resume(); this._sound.startAmbient(); }
    this._ui.setSoundIcon(this._sound.muted);
    this._ui.setSettingSound(s.settings.sound);
    this._save.save(s);
  }

  _toggleQuality() {
    const s = this._state;
    s.settings.lowQuality = !s.settings.lowQuality;
    this._ui.setSettingQuality(s.settings.lowQuality);
    this._save.save(s);
    if (this._scene) this._ui.toast("⚙️ A qualidade muda ao recarregar o jardim.");
  }

  _resetProgress() {
    this._state = this._save.reset();
    this._sound.setMuted(!this._state.settings.sound);
    this._ui.closePanel();
    this._ui.toast("🗑️ Progresso apagado.");
    this._ui.setHUD(this._state, this._levelProgress());
    this._ui.showSaveInfo(this._state, false);
    if (this._scene && this._scene.flowers) {
      this._ui.renderCollection(this._state);
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this._scene) this._scene.resize(w, h);
  }

  /** Tear down: stop loop, save, and release GPU resources */
  destroy() {
    this._running = false;
    this._save.save(this._state);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._scene) this._scene.dispose();
    this._scene = null;
  }
}
