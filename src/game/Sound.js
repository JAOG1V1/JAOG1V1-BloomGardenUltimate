/**
 * Sound — tiny dependency-free WebAudio helper. Generates short synth blips for
 * clicks, collecting power-ups and levelling up, plus a soft ambient pad. The
 * AudioContext is created lazily on the first user gesture so autoplay policies
 * are respected. Everything is mutable via setMuted().
 */
export class Sound {
  constructor(muted = false) {
    this._muted = muted;
    this._ctx = null;
    this._master = null;
    this._ambient = null;
  }

  _ensure() {
    if (this._ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this._ctx = new Ctx();
      this._master = this._ctx.createGain();
      this._master.gain.value = this._muted ? 0 : 0.5;
      this._master.connect(this._ctx.destination);
    } catch {
      this._ctx = null;
    }
  }

  /** Resume the context (call from a user gesture). */
  resume() {
    this._ensure();
    if (this._ctx && this._ctx.state === "suspended") this._ctx.resume();
  }

  setMuted(muted) {
    this._muted = muted;
    if (this._master) this._master.gain.value = muted ? 0 : 0.5;
    if (muted) this.stopAmbient();
  }

  get muted() { return this._muted; }

  _blip(freq, dur = 0.12, type = "sine", gain = 0.3, slideTo = null) {
    this._ensure();
    if (!this._ctx || this._muted) return;
    const t = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    const g = this._ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this._master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  click()   { this._blip(420 + Math.random() * 80, 0.1, "triangle", 0.22, 760); }
  collect() { this._blip(660, 0.16, "sine", 0.3, 1180); }
  levelUp() {
    this._blip(523, 0.18, "sine", 0.3);
    setTimeout(() => this._blip(659, 0.18, "sine", 0.3), 110);
    setTimeout(() => this._blip(784, 0.26, "sine", 0.3), 230);
  }

  /** Soft two-oscillator ambient pad. */
  startAmbient() {
    this._ensure();
    if (!this._ctx || this._muted || this._ambient) return;
    const make = (freq, detune, vol) => {
      const osc = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      g.gain.value = vol;
      osc.connect(g);
      g.connect(this._master);
      osc.start();
      return { osc, g };
    };
    this._ambient = [make(110, 0, 0.04), make(165, 6, 0.03), make(220, -5, 0.02)];
  }

  stopAmbient() {
    if (!this._ambient) return;
    for (const a of this._ambient) {
      try { a.osc.stop(); } catch { /* already stopped */ }
    }
    this._ambient = null;
  }
}
