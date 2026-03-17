import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    // Three.js is intentionally large; raise the warning threshold
    chunkSizeWarningLimit: 600
  }
});
