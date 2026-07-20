import { defineConfig } from "vite";

// DEPLOY_BASE is set by the GitHub Pages workflow (e.g. "/knowtheworld/");
// local dev and preview use "/".
export default defineConfig({
  base: process.env.DEPLOY_BASE ?? "/",
});
