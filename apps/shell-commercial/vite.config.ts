import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// CSP frame-ancestors: permite iframing apenas da mesma origem (embed protocol).
// Em produção: restringir a domínios SaaS standalone específicos.
const cspHeaders = {
  "Content-Security-Policy":
    "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*",
};

export default defineConfig({
  server: { headers: cspHeaders },
  preview: { headers: cspHeaders },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Cloud shell: network first for API responses, cache for assets
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
