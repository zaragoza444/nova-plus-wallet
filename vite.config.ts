import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.VITE_BASE_PATH || "/";

function spaFallback404(): Plugin {
  return {
    name: "spa-fallback-404",
    closeBundle() {
      const index = resolve("dist/index.html");
      if (existsSync(index)) copyFileSync(index, resolve("dist/404.html"));
    },
  };
}

export default defineConfig({
  base,
  plugins: [react(), spaFallback404()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['novabank.uk', '.novabank.uk', 'localhost'],
    proxy: {
      "/api/v1": { target: "https://www.nova-x.io", changeOrigin: true, secure: true },
      "/onex-rpc": { target: "https://www.nova-x.io", changeOrigin: true, secure: true },
    },
  },
});
