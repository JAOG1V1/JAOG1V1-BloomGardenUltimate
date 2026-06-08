import { Game } from "./game/Game.js";
import "./styles/style.css";

const canvas = document.getElementById("scene");
const game = new Game(canvas);

// Expose for debugging
window.__BLOOM_GAME__ = game;

// Register the service worker for offline play / installability (production
// only — skipped in dev so it never interferes with Vite's HMR).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => { /* offline support is a progressive enhancement */ });
  });
}
