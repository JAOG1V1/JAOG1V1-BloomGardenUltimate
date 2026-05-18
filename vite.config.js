import { defineConfig } from "vite";

export default defineConfig({
  base: "/JAOG1V1-BloomGardenUltimate/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
    // Three.js is intentionally large; raise the warning threshold
    chunkSizeWarningLimit: 600
  }
});
