import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        // Precache all app assets including WASM (sql.js ~660 KB)
        globPatterns: ["**/*.{js,css,html,svg,webmanifest,wasm}"],
        // Allow WASM up to 5 MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Clean up old caches on SW activation
        cleanupOutdatedCaches: true,
        // Cache first for all precached assets
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["@tanstack/react-router"],
        },
      },
    },
  },
});
