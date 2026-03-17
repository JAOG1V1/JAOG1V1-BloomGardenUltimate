import { GardenScene } from "../scenes/GardenScene.js";
import { SaveSystem }  from "./SaveSystem.js";
import { UI }          from "./UI.js";

const SAVE_INTERVAL_MS = 10_000; // auto-save every 10 s
const ENERGY_DECAY     = 0.008;  // energy lost per second
const ENERGY_CLICK     = 12;     // energy gained per click
const SAP_PER_ENERGY   = 0.04;   // sap generated per energy unit per second
const SCORE_PER_SAP    = 0.5;    // score generated per sap unit per second
const LEVEL_SAP_REQ    = 200;    // sap required to level up (multiplied by level)

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
    this._ui.setHUD(this._state);
    this._ui.setMessage("🌸 Bem-vindo ao Bloom Garden Ultimate!");

    this._ui.bindStart(() => this._startGame());
  }

  _startGame() {
    this._ui.setMenuVisible(false);
    this._ui.setMessage("Clique na flor para energizar o jardim ✨");

    // Build Three.js scene
    this._scene = new GardenScene(this._canvas);
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(document.documentElement);
    this._onResize();

    // Pointer interaction
    this._canvas.addEventListener("pointerdown", e => this._onPointer(e));

    // Start loop
    this._running = true;
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

  _update(dt, time) {
    const s  = this._state;
    const dt_s = dt / 1000;

    // Energy decays over time
    s.energy = Math.max(0, s.energy - ENERGY_DECAY * dt_s * 100);

    // Generate sap if we have energy
    if (s.energy > 0) {
      s.sap   += SAP_PER_ENERGY * (s.energy / 100) * dt_s * 100;
      s.score += SCORE_PER_SAP * (s.sap * 0.001) * dt_s * 100;
    }

    // Level up
    const sapReq = LEVEL_SAP_REQ * s.level;
    if (s.sap >= sapReq) {
      s.level += 1;
      s.sap -= sapReq;
      this._ui.setMessage(`🌟 Nível ${s.level} alcançado! O jardim floresce mais forte!`);
    }

    this._ui.setHUD(s);
  }

  // ── Interaction ──────────────────────────────────────────────────────────

  _onPointer(e) {
    if (!this._scene) return;
    const rect = this._canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = this._scene.handlePointer(x, y, rect.width, rect.height);

    if (hit) {
      this._state.energy = Math.min(100, this._state.energy + ENERGY_CLICK);
      this._state.totalClicks++;
      const clicks = this._state.totalClicks;
      const msgs = [
        "✨ A flor absorveu sua energia!",
        "🌸 O jardim vibra com sua presença!",
        "💫 Partículas mágicas dançam ao redor!",
        "🌿 As pétalas brilham mais forte!",
        "⚡ Energia liberada — o jardim agradece!"
      ];
      this._ui.setMessage(msgs[clicks % msgs.length]);
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this._scene) this._scene.resize(w, h);
  }
}
