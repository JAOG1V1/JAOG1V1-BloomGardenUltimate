export class UI {
  constructor() {
    this.scoreValue     = document.getElementById("score-value");
    this.sapValue       = document.getElementById("sap-value");
    this.energyValue    = document.getElementById("energy-value");
    this.levelValue     = document.getElementById("level-value");
    this.levelNext      = document.getElementById("level-next");
    this.timeValue      = document.getElementById("time-value");
    this.energyBarFill  = document.getElementById("energy-bar-fill");
    this.levelBarFill   = document.getElementById("level-bar-fill");
    this.messageBox     = document.getElementById("message-box");
    this.menuOverlay    = document.getElementById("menu-overlay");
    this.startButton    = document.getElementById("start-button");
    this.uiRoot         = document.getElementById("ui-root");
    this.loadingOverlay = document.getElementById("loading-overlay");
    this.fxLayer        = document.getElementById("fx-layer");
    this._photoMode     = false;
  }

  /**
   * Attach the menu start handler. Fires once on click, touch, or keyboard,
   * covering desktop (click/Enter/Space) and mobile (touch -> pointerup).
   */
  bindStart(handler) {
    let fired = false;
    const run = (e) => {
      if (fired) return;
      fired = true;
      if (e) e.preventDefault();
      this.startButton.removeEventListener("pointerup", run);
      this.startButton.removeEventListener("click", run);
      handler();
    };
    // pointerup covers mouse, touch and pen; click is the keyboard fallback.
    this.startButton.addEventListener("pointerup", run);
    this.startButton.addEventListener("click", run);
    // Move keyboard focus to the CTA so Enter/Space work immediately.
    this.startButton.focus({ preventScroll: true });
  }

  /** Bind day/night toggle button */
  bindDayNightToggle(handler) {
    const btn = document.getElementById("btn-day-night");
    if (btn) btn.addEventListener("click", handler);
  }

  /** Bind photo mode toggle button (click + Esc to exit) */
  bindPhotoMode(handler) {
    const btn = document.getElementById("btn-photo");
    const apply = () => {
      this.uiRoot.classList.toggle("photo-mode", this._photoMode);
      if (btn) {
        btn.textContent = this._photoMode ? "📷 Sair" : "📷";
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

  /** Show or hide the main menu */
  setMenuVisible(visible) {
    this.menuOverlay.style.display = visible ? "grid" : "none";
  }

  /** Show / hide the 3D loading indicator */
  setLoadingVisible(visible) {
    if (!this.loadingOverlay) return;
    if (visible) {
      this.loadingOverlay.hidden = false;
      this.loadingOverlay.classList.remove("fade-out");
    } else {
      this.loadingOverlay.classList.add("fade-out");
      // Remove from layout after the fade transition completes.
      setTimeout(() => { this.loadingOverlay.hidden = true; }, 520);
    }
  }

  /** Update all HUD values from the game state object */
  setHUD(state, levelProgress = 0) {
    this.scoreValue.textContent    = Math.floor(state.score).toLocaleString("pt-BR");
    this.sapValue.textContent      = Math.floor(state.sap);
    this.energyValue.textContent   = Math.floor(state.energy);
    this.levelValue.textContent    = state.level;
    if (this.levelNext) this.levelNext.textContent = state.level + 1;
    this.energyBarFill.style.width = `${Math.max(0, Math.min(100, state.energy))}%`;
    if (this.levelBarFill) {
      this.levelBarFill.style.width = `${Math.max(0, Math.min(100, levelProgress * 100))}%`;
    }
  }

  /** Update the time of day display */
  setTimeLabel(label) {
    if (this.timeValue) this.timeValue.textContent = label;
  }

  /** Update the bottom message bar */
  setMessage(text) {
    this.messageBox.textContent = text;
  }

  /** Spawn a floating "+N" feedback number at screen coordinates */
  floatText(x, y, text) {
    if (!this.fxLayer) return;
    const el = document.createElement("span");
    el.className = "fx-pop";
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    this.fxLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
    // Safety cleanup in case animationend doesn't fire.
    setTimeout(() => el.remove(), 1200);
  }
}
