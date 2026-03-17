import { Game } from "./game/Game.js";
import "./styles/style.css";

const canvas = document.getElementById("scene");
const game = new Game(canvas);

// Expose for debugging
window.__BLOOM_GAME__ = game;
