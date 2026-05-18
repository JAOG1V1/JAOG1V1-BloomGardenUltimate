export class UI {
  constructor() {
    this.scoreValue     = document.getElementById("score-value");
    this.sapValue       = document.getElementById("sap-value");
    this.energyValue    = document.getElementById("energy-value");
    this.levelValue     = document.getElementById("level-value");
    this.timeValue      = document.getElementById("time-value");
    this.energyBarFill  = document.getElementById("energy-bar-fill");
    this.messageBox     = document.getElementById("message-box");
    this.menuOverlay    = document.getElementById("menu-overlay");
    this.startButton    = document.getElementById("start-button");
    this.uiRoot         = document.getElementById("ui-root");
    this._photoMode     = false;
  }

  /** Attach the menu start handler */
  bindStart(handler) {
    this.startButton.addEventListener("click", handler, { once: true });
  }

  /** Bind day/night toggle button */
  bindDayNightToggle(handler) {
    const btn = document.getElementById("btn-day-night");
    if (btn) btn.addEventListener("click", handler);
  }

  /** Bind photo mode toggle button */
  bindPhotoMode(handler) {
    const btn = document.getElementById("btn-photo");
    if (btn) btn.addEventListener("click", () => {
      this._photoMode = !this._photoMode;
      this.uiRoot.classList.toggle("photo-mode", this._photoMode);
      btn.textContent = this._photoMode ? "📷 Sair" : "📷 Foto";
      if (handler) handler(this._photoMode);
    });
  }

  /** Show or hide the main menu */
  setMenuVisible(visible) {
    this.menuOverlay.style.display = visible ? "grid" : "none";
  }

  /** Update all HUD values from the game state object */
  setHUD(state) {
    this.scoreValue.textContent    = Math.floor(state.score);
    this.sapValue.textContent      = Math.floor(state.sap);
    this.energyValue.textContent   = Math.floor(state.energy);
    this.levelValue.textContent    = state.level;
    this.energyBarFill.style.width = `${Math.max(0, Math.min(100, state.energy))}%`;
  }

  /** Update the time of day display */
  setTimeLabel(label) {
    if (this.timeValue) this.timeValue.textContent = label;
  }

  /** Update the bottom message bar */
  setMessage(text) {
    this.messageBox.textContent = text;
  }
}
