import { defineConfig } from "vite";
import { resolve } from "node:path";

// A relative base makes the build path-agnostic: the same artifact works at
// /knowtheworld/ (github.io) and at / (custom domain). That decouples the
// domain switch from any deploy — no coordinated push, no downtime window.
// Safe here because routing is hash-based, so the document path never changes.
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        impressum: resolve(__dirname, "impressum.html"),
        datenschutz: resolve(__dirname, "datenschutz.html"),
      },
    },
  },
});
