import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pruebas de componentes con Vitest + React Testing Library.
// jsdom simula el navegador (DOM) dentro de Node.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mismo alias que tsconfig.json: "@/..." -> "src/..."
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    restoreMocks: true,
  },
});
