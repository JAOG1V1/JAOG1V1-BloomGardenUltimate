export class UI {
  constructor() {
    this.scoreValue     = document.getElementById("score-value");
    this.sapValue       = document.getElementById("sap-value");
    this.energyValue    = document.getElementById("energy-value");
    this.levelValue     = document.getElementById("level-value");
    this.energyBarFill  = document.getElementById("energy-bar-fill");
    this.messageBox     = document.getElementById("message-box");
    this.menuOverlay    = document.getElementById("menu-overlay");
    this.startButton    = document.getElementById("start-button");
  }

  /** Attach the menu start handler */
  bindStart(handler) {
    this.startButton.addEventListener("click", handler, { once: true });
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

  /** Update the bottom message bar */
  setMessage(text) {
    this.messageBox.textContent = text;
  }
}
