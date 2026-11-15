import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Pruebas E2E de MultiServ con Playwright (Calidad de Software).
//
// SOLO LOCAL: necesitan la base de datos real (Supabase) y los dos servidores
// encendidos. No corren en GitHub Actions (el workflow de CI no las llama).
//
// Antes de correr:
//   1. backend/  -> npm run start      (puerto 3001)
//   2. frontend/ -> npm run dev        (puerto 3000)
//   3. frontend/ -> npm run test:e2e
//
// No se usa `webServer`: Playwright no levanta ni compila la app (un
// `next build` con `next dev` encendido rompe las rutas /api con [id]).

// Credenciales del seed: se leen de backend/.env (que no se sube al repo).
// process.loadEnvFile viene con Node; no hace falta dotenv. No pisa
// variables que ya existan en el entorno.
try {
  process.loadEnvFile(path.join(__dirname, "..", "backend", ".env"));
} catch {
  // Sin backend/.env: cada prueba que necesite una clave falla con un
  // mensaje que nombra la variable (ver e2e/apoyo/sesion.ts).
}

const CARPETA_CALIDAD = path.join(
  __dirname,
  "..",
  "docs",
  "calidad",
  "10_Playwright",
);

export default defineConfig({
  testDir: "./e2e",
  // Trazas, capturas y video de los fallos. Está en .gitignore: las trazas
  // guardan lo que se escribe en el login (incluida la contraseña).
  outputDir: path.join(CARPETA_CALIDAD, "resultados"),

  // Un solo worker: `next dev` compila cada página la primera vez que se pide
  // y la base está en la nube; en serie los tiempos son estables. Las pruebas
  // NO dependen entre sí (cada una crea sus propios datos), así que también
  // podrían correr en paralelo.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,

  // El flujo completo recorre ~15 pantallas y diálogos contra la base real.
  timeout: 120_000,
  expect: { timeout: 15_000 },

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: path.join(CARPETA_CALIDAD, "reporte-html"),
        open: "never",
      },
    ],
  ],

  use: {
    baseURL: "http://localhost:3000",
    locale: "es-CO",
    timezoneId: "America/Bogota",
    // Con retries: 0, "on-first-retry" nunca grabaría: se guarda la traza
    // de cada prueba que falla.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // La primera compilación de una página en `next dev` puede tardar.
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
