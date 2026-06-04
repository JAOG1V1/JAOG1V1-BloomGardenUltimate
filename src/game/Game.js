import { GardenScene } from "../scenes/GardenScene.js";
import { SaveSystem }  from "./SaveSystem.js";
import { UI }          from "./UI.js";

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

/**
 * Game — root class that wires together the scene, UI, save system, and loop.
 */
export class Game {
  constructor(canvas) {
    this._canvas = canvas;
    this._save   = new SaveSystem();
    this._ui     = new UI();
    this._scene  = null; // created after menu start

    this._state = this._save.load();
    this._lastSave = 0;
    this._running  = false;
    this._lastTime = 0;

    this._setup();
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  _setup() {
    this._ui.setMenuVisible(true);
    this._ui.setHUD(this._state, this._levelProgress());
    this._ui.setMessage("🌸 Bem-vindo ao Bloom Garden Ultimate!");

    this._ui.bindStart(() => this._startGame());

    // Persist progress when the tab is closed or hidden (mobile-safe).
    this._persist = () => this._save.save(this._state);
    window.addEventListener("beforeunload", this._persist);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this._persist();
    });
  }

  _startGame() {
    this._ui.setMenuVisible(false);
    this._ui.setLoadingVisible(true);
    this._ui.setMessage("Clique na flor para energizar o jardim ✨");

    // Defer the (synchronous, heavy) scene build by two frames so the browser
    // paints the loading overlay first — no black/frozen screen.
    requestAnimationFrame(() => requestAnimationFrame(() => this._buildScene()));
  }

  _buildScene() {
    // Build Three.js scene
    this._scene = new GardenScene(this._canvas);
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(document.documentElement);
    this._onResize();

    // Pointer interaction (pointerdown unifies mouse, touch and pen)
    this._canvas.addEventListener("pointerdown", e => this._onPointer(e));

    // Day/Night toggle (smooth) + Photo mode
    this._ui.bindDayNightToggle(() => {
      if (this._scene) this._scene.toggleDayNight();
    });
    this._ui.bindPhotoMode(null);

    // First render, then reveal the world.
    this._scene.update(performance.now());
    this._ui.setLoadingVisible(false);

    // Start loop
    this._running = true;
    this._lastTime = performance.now();
    requestAnimationFrame(t => this._loop(t));
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
    const lvlMul = 1 + (s.level - 1) * 0.15; // higher level → faster growth

    // Energy: passive trickle up, steady decay down.
    s.energy += ENERGY_PASSIVE_PER_S * dt_s;
    s.energy  = Math.max(0, Math.min(100, s.energy - ENERGY_DECAY_PER_S * dt_s));

    const energyFrac = s.energy / 100;

    // Energy → seiva (sap) and permanent pontos (score).
    s.sap   += SAP_PER_S   * energyFrac * lvlMul * dt_s;
    s.score += SCORE_PER_S * energyFrac * lvlMul * dt_s;

    // Seiva → nível (spend sap to grow the garden a level).
    let leveled = false;
    while (s.sap >= this._sapReq()) {
      s.sap -= this._sapReq();
      s.level += 1;
      leveled = true;
    }
    if (leveled) {
      this._save.save(s); // persist milestones immediately
      this._ui.setMessage(`🌟 Nível ${s.level} alcançado! O jardim floresce mais forte!`);
      if (this._scene) this._scene.energize();
    }

    this._ui.setHUD(s, this._levelProgress());

    // Update time display
    if (this._scene) this._ui.setTimeLabel(this._scene.timeLabel);
  }

  // ── Interaction ──────────────────────────────────────────────────────────

  _onPointer(e) {
    if (!this._scene) return;
    const rect = this._canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = this._scene.handlePointer(x, y, rect.width, rect.height);

    if (hit) {
      const s = this._state;
      s.energy = Math.min(100, s.energy + ENERGY_CLICK);
      s.totalClicks++;

      // Immediate, satisfying score reward (scales with level).
      const gain = SCORE_PER_CLICK * s.level;
      s.score += gain;

      // Floating "+N" feedback at the touch/click point.
      this._ui.floatText(e.clientX, e.clientY, `+${gain}`);
      this._ui.setHUD(s, this._levelProgress());

      const msgs = [
        "✨ A flor absorveu sua energia!",
        "🌸 O jardim vibra com sua presença!",
        "💫 Partículas mágicas dançam ao redor!",
        "🌿 As pétalas brilham mais forte!",
        "⚡ Energia liberada — o jardim agradece!"
      ];
      this._ui.setMessage(msgs[s.totalClicks % msgs.length]);
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
