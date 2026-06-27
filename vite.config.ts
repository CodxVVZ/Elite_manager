import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "@shared": path.resolve(import.meta.dirname, "."),
      "@assets": path.resolve(import.meta.dirname, "."),
    },
  },
  root: import.meta.dirname,
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
  }
});
