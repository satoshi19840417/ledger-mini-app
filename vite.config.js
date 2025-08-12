// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["/icons/favicon-32.png"],
      manifest: {
        name: "家計簿ミニアプリ",
        short_name: "家計簿",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0EA5E9",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }
        ]
      },
      workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg}"] },
      devOptions: { enabled: true, navigateFallback: "index.html" }
    })
  ]
});
