import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Renderer lives in ./renderer. base "./" so Electron can load via file://.
export default defineConfig({
  root: "renderer",
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
