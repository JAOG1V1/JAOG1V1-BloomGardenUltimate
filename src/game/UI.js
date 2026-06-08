import { SPECIES } from "../systems/FlowerSpecies.js";
import { ACHIEVEMENTS } from "./Achievements.js";
import { UPGRADES, upgradeLevel, upgradeCost } from "./Upgrades.js";

const $ = (id) => document.getElementById(id);

/**
 * UI — owns every DOM element and exposes a small API the Game drives. It also
 * fixes the original bug where the HUD/toast were visible behind the menu: the
 * in-game layer is gated behind the `#ui-root.in-game` class and only revealed
 * once the player enters the garden.
 */
export class UI {
  constructor() {
    this.uiRoot         = $("ui-root");
    this.scoreValue     = $("score-value");
    this.sapValue       = $("sap-value");
    this.energyValue    = $("energy-value");
    this.levelValue     = $("level-value");
    this.levelNext      = $("level-next");
    this.timeValue      = $("time-value");
    this.energyBarFill  = $("energy-bar-fill");
    this.levelBarFill   = $("level-bar-fill");
    this.messageBox     = $("message-box");
    this.menuOverlay    = $("menu-overlay");
    this.startButton    = $("start-button");
    this.continueButton = $("btn-continue");
    this.loadingOverlay = $("loading-overlay");
    this.fxLayer        = $("fx-layer");
    this.toastLayer     = $("toast-layer");
    this.sceneFade      = $("scene-fade");

    this.comboMeter   = $("combo-meter");
    this.comboMult    = $("combo-mult");
    this.comboBarFill = $("combo-bar-fill");
    this.powerupTray  = $("powerup-tray");

    this.panelOverlay = $("panel-overlay");
    this._photoMode   = false;

    this._buildMenuPetals();
  }

  // ── Menu petals (decorative) ───────────────────────────────────────────────
  _buildMenuPetals() {
    const host = $("menu-petals");
    if (!host) return;
    const emojis = ["🌸", "🌺", "🌼", "🌷", "✨", "🍃"];
    for (let i = 0; i < 16; i++) {
      const el = document.createElement("span");
      el.className = "petal";
      el.textContent = emojis[i % emojis.length];
      el.style.left = `${Math.random() * 100}%`;
      el.style.fontSize = `${14 + Math.random() * 18}px`;
      el.style.animationDuration = `${7 + Math.random() * 9}s`;
      el.style.animationDelay = `${-Math.random() * 12}s`;
      host.appendChild(el);
    }
  }

  // ── Visibility / transitions ───────────────────────────────────────────────
  setMenuVisible(visible) {
    this.menuOverlay.style.display = visible ? "grid" : "none";
  }

  /** Reveal the in-game HUD layer (fixes the HUD-on-menu bug). */
  setInGame(on) {
    this.uiRoot.classList.toggle("in-game", on);
  }

  fade(show) {
    if (!this.sceneFade) return;
    this.sceneFade.classList.toggle("show", show);
  }

  setLoadingVisible(visible) {
    if (!this.loadingOverlay) return;
    if (visible) {
      this.loadingOverlay.hidden = false;
      this.loadingOverlay.classList.remove("fade-out");
    } else {
      this.loadingOverlay.classList.add("fade-out");
      setTimeout(() => { this.loadingOverlay.hidden = true; }, 520);
    }
  }

  // ── Menu wiring ────────────────────────────────────────────────────────────
  bindStart(handler) { this._bindButton(this.startButton, handler, true); }
  bindContinue(handler) { this._bindButton(this.continueButton, handler, false); }

  _bindButton(btn, handler, focus) {
    if (!btn) return;
    const run = (e) => { if (e) e.preventDefault(); handler(); };
    btn.addEventListener("click", run);
    if (focus) btn.focus({ preventScroll: true });
  }

  /** Show the Continue button + saved level/score when a save exists. */
  showSaveInfo(state, hasSave) {
    const save = $("menu-save");
    if (hasSave) {
      this.continueButton.hidden = false;
      $("menu-save-level").textContent = state.level;
      $("menu-save-score").textContent = Math.floor(state.score).toLocaleString("pt-BR");
      if (save) save.hidden = false;
      this.startButton.querySelector("span").textContent = "Novo Jogo";
    } else {
      this.continueButton.hidden = true;
      if (save) save.hidden = true;
      this.startButton.querySelector("span").textContent = "Entrar no Jardim";
    }
  }

  bindMenuActions({ onSettings, onCredits, onHowto }) {
    $("btn-settings")?.addEventListener("click", () => onSettings());
    $("btn-credits")?.addEventListener("click", () => onCredits());
    $("btn-howto")?.addEventListener("click", () => onHowto && onHowto());
  }

  // ── Action buttons ─────────────────────────────────────────────────────────
  bindDayNightToggle(handler) { $("btn-day-night")?.addEventListener("click", handler); }
  bindShopButton(handler)     { $("btn-shop")?.addEventListener("click", handler); }
  bindCollectionButton(handler) { $("btn-collection")?.addEventListener("click", handler); }
  bindSoundButton(handler)    { $("btn-sound")?.addEventListener("click", handler); }
  bindHelpButton(handler)     { $("btn-help")?.addEventListener("click", handler); }

  setSoundIcon(muted) {
    const b = $("btn-sound");
    if (b) b.textContent = muted ? "🔇" : "🔊";
  }

  bindPhotoMode(handler) {
    const btn = $("btn-photo");
    const apply = () => {
      this.uiRoot.classList.toggle("photo-mode", this._photoMode);
      if (btn) {
        btn.textContent = this._photoMode ? "📷✕" : "📷";
        btn.setAttribute("aria-pressed", String(this._photoMode));
      }
      if (handler) handler(this._photoMode);
    };
    const toggle = () => { this._photoMode = !this._photoMode; apply(); };
    if (btn) btn.addEventListener("click", toggle);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._photoMode) toggle();
    });
  }

  // ── Panels ─────────────────────────────────────────────────────────────────
  bindPanels() {
    // Close buttons + click on backdrop.
    this.panelOverlay.querySelectorAll("[data-close]").forEach(b =>
      b.addEventListener("click", () => this.closePanel()));
    this.panelOverlay.addEventListener("click", (e) => {
      if (e.target === this.panelOverlay) this.closePanel();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.panelOverlay.hidden) this.closePanel();
    });
  }

  openPanel(name) {
    this._panelOpener = document.activeElement;
    this.panelOverlay.hidden = false;
    this.panelOverlay.querySelectorAll(".panel").forEach(p => {
      p.hidden = p.dataset.panel !== name;
    });
    // Keyboard accessibility: trap focus inside the open panel and move focus to
    // it, so Tab cycles within the dialog instead of leaking to the page behind.
    const active = this.panelOverlay.querySelector(`.panel[data-panel="${name}"]`);
    if (active) {
      this._trapFocus(active);
      const target = active.querySelector(".panel-close") || active;
      target.focus?.({ preventScroll: true });
    }
  }

  closePanel() {
    this.panelOverlay.hidden = true;
    this._releaseTrap();
    // Return focus to whatever opened the panel (button in the HUD/menu).
    if (this._panelOpener && this._panelOpener.focus) {
      this._panelOpener.focus({ preventScroll: true });
    }
    this._panelOpener = null;
  }

  /** True when a Space/Enter press should energize the flower (not drive UI). */
  isGameplayFocus() {
    if (!this.panelOverlay.hidden) return false;
    if (this.menuOverlay.style.display !== "none") return false;
    const tut = $("tutorial-overlay");
    if (tut && !tut.hidden) return false;
    const a = document.activeElement;
    if (a && ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A"].includes(a.tagName)) return false;
    return true;
  }

  /** Keep Tab focus within `container` until released. */
  _trapFocus(container) {
    this._releaseTrap();
    this._trapHandler = (e) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", this._trapHandler, true);
  }

  _releaseTrap() {
    if (this._trapHandler) {
      document.removeEventListener("keydown", this._trapHandler, true);
      this._trapHandler = null;
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────────────
  setHUD(state, levelProgress = 0) {
    this.scoreValue.textContent  = Math.floor(state.score).toLocaleString("pt-BR");
    this.sapValue.textContent    = Math.floor(state.sap);
    this.energyValue.textContent = Math.floor(state.energy);
    this.levelValue.textContent  = state.level;
    if (this.levelNext) this.levelNext.textContent = state.level + 1;
    this.energyBarFill.style.width = `${Math.max(0, Math.min(100, state.energy))}%`;
    if (this.levelBarFill) {
      this.levelBarFill.style.width = `${Math.max(0, Math.min(100, levelProgress * 100))}%`;
    }
  }

  setTimeLabel(label) { if (this.timeValue) this.timeValue.textContent = label; }
  setMessage(text) { this.messageBox.textContent = text; }

  // ── Combo ──────────────────────────────────────────────────────────────────
  setCombo(mult, frac) {
    if (mult <= 1) { this.hideCombo(); return; }
    this.comboMeter.classList.add("active");
    this.comboMult.textContent = `x${mult}`;
    this.comboBarFill.style.width = `${Math.max(0, Math.min(100, frac * 100))}%`;
  }

  bumpCombo() {
    this.comboMeter.classList.remove("bump");
    void this.comboMeter.offsetWidth; // restart animation
    this.comboMeter.classList.add("bump");
  }

  hideCombo() { this.comboMeter.classList.remove("active"); }

  // ── Active power-up badges ─────────────────────────────────────────────────
  setPowerups(list) {
    if (!list.length) { this.powerupTray.classList.remove("active"); this.powerupTray.innerHTML = ""; return; }
    this.powerupTray.classList.add("active");
    this.powerupTray.innerHTML = list.map(p =>
      `<div class="powerup-badge"><span class="pb-icon">${p.icon}</span><span class="pb-time">${Math.ceil(p.time)}s</span></div>`
    ).join("");
  }

  // ── Floating "+N" feedback ─────────────────────────────────────────────────
  floatText(x, y, text, cls = "") {
    if (!this.fxLayer) return;
    const el = document.createElement("span");
    el.className = `fx-pop ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    this.fxLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
    setTimeout(() => el.remove(), 1200);
  }

  // ── Centre toast ───────────────────────────────────────────────────────────
  toast(text) {
    if (!this.toastLayer) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = text;
    this.toastLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
    setTimeout(() => el.remove(), 3200);
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  bindSettings({ onSound, onQuality, onReset }) {
    $("setting-sound")?.addEventListener("click", onSound);
    $("setting-quality")?.addEventListener("click", onQuality);
    $("setting-reset")?.addEventListener("click", onReset);
  }

  setSettingSound(on) {
    const b = $("setting-sound");
    if (b) { b.textContent = on ? "Ligado" : "Desligado"; b.setAttribute("aria-pressed", String(on)); }
  }

  setSettingQuality(low) {
    const b = $("setting-quality");
    if (b) { b.textContent = low ? "Reduzida" : "Auto"; b.setAttribute("aria-pressed", String(low)); }
  }

  // ── Shop ─────────────────────────────────────────────────────────────────
  renderShop(state, onBuy) {
    $("shop-score").textContent = Math.floor(state.score).toLocaleString("pt-BR");
    $("shop-sap").textContent   = Math.floor(state.sap);
    const list = $("shop-list");
    list.innerHTML = "";
    for (const u of UPGRADES) {
      const lvl = upgradeLevel(state, u.id);
      const maxed = lvl >= u.max;
      const cost = upgradeCost(u, lvl);
      const cur = u.currency === "sap" ? state.sap : state.score;
      const curIcon = u.currency === "sap" ? "💧" : "⭐";
      const afford = cur >= cost;

      const row = document.createElement("div");
      row.className = "shop-item";
      row.innerHTML = `
        <span class="si-icon">${u.icon}</span>
        <div class="si-body">
          <div class="si-name">${u.name}</div>
          <div class="si-desc">${u.desc}</div>
          <div class="si-level">Nível ${lvl}/${u.max}</div>
        </div>
        <button class="shop-buy ${maxed ? "maxed" : ""}" ${(!afford || maxed) ? "disabled" : ""}>
          ${maxed ? "MÁX" : `${curIcon} ${cost.toLocaleString("pt-BR")}`}
        </button>`;
      if (!maxed) {
        row.querySelector(".shop-buy").addEventListener("click", () => onBuy(u.id));
      }
      list.appendChild(row);
    }
  }

  // ── Collection & achievements ──────────────────────────────────────────────
  renderCollection(state) {
    const grid = $("species-grid");
    grid.innerHTML = "";
    for (const sp of SPECIES) {
      const unlocked = (state.unlockedSpecies || []).includes(sp.id);
      const cell = document.createElement("div");
      cell.className = `species-cell ${unlocked ? "" : "locked"}`;
      cell.innerHTML = `<div class="sc-emoji">${unlocked ? sp.emoji : "❔"}</div>
                        <div class="sc-name">${unlocked ? sp.name : "???"}</div>`;
      grid.appendChild(cell);
    }

    const list = $("achievement-list");
    list.innerHTML = "";
    for (const a of ACHIEVEMENTS) {
      const earned = (state.achievements || []).includes(a.id);
      const row = document.createElement("div");
      row.className = `achievement ${earned ? "" : "locked"}`;
      row.innerHTML = `<span class="a-icon">${a.icon}</span>
        <div><div class="a-name">${a.name}</div><div class="a-desc">${a.desc}</div></div>
        <span class="a-check">${earned ? "✅" : "🔒"}</span>`;
      list.appendChild(row);
    }
  }

  // ── Guided tutorial ─────────────────────────────────────────────────────────
  /** Bind the "redo tutorial" button inside the How-to-play panel. */
  bindHowtoTutorial(handler) {
    $("howto-tutorial")?.addEventListener("click", () => handler && handler());
  }

  /**
   * Show a short, step-by-step guided tutorial. `steps` is an array of
   * { emoji, title, text }. `onDone` is called when the player finishes or skips.
   */
  showTutorial(steps, onDone) {
    const overlay = $("tutorial-overlay");
    if (!overlay || !steps || !steps.length) { if (onDone) onDone(); return; }

    const emojiEl = $("tutorial-emoji");
    const titleEl = $("tutorial-title");
    const textEl  = $("tutorial-text");
    const dotsEl  = $("tutorial-dots");
    const nextBtn = $("tutorial-next");
    const skipBtn = $("tutorial-skip");

    dotsEl.innerHTML = steps.map(() => "<span></span>").join("");
    let i = 0;
    let finished = false;

    const render = () => {
      const s = steps[i];
      emojiEl.textContent = s.emoji || "🌸";
      titleEl.textContent = s.title || "";
      textEl.textContent  = s.text || "";
      dotsEl.querySelectorAll("span").forEach((d, k) => d.classList.toggle("on", k === i));
      nextBtn.textContent = i === steps.length - 1 ? "Começar! 🌱" : "Próximo →";
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      overlay.hidden = true;
      nextBtn.removeEventListener("click", onNext);
      skipBtn.removeEventListener("click", finish);
      if (onDone) onDone();
    };

    const onNext = () => {
      if (i >= steps.length - 1) { finish(); return; }
      i++; render();
    };

    nextBtn.addEventListener("click", onNext);
    skipBtn.addEventListener("click", finish);

    render();
    overlay.hidden = false;
    nextBtn.focus?.({ preventScroll: true });
  }
}
