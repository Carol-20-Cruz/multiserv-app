import { expect, type Page } from "@playwright/test";

// Usuarios del seed (backend/src/seed.ts). Los correos no son secretos; las
// contraseñas se leen de backend/.env (playwright.config.ts) y NUNCA se
// imprimen ni se escriben en el código.
const USUARIOS = {
  DUENO: { correo: "dueno@multiserv.test", variable: "SEED_DUENO_PASSWORD" },
  TECNICO: {
    correo: "tecnico@multiserv.test",
    variable: "SEED_TECNICO_PASSWORD",
  },
} as const;

export type RolPrueba = keyof typeof USUARIOS;

export function credenciales(rol: RolPrueba) {
  const { correo, variable } = USUARIOS[rol];
  const password = process.env[variable];
  if (!password) {
    // Solo el NOMBRE de la variable, nunca su valor.
    throw new Error(
      `Falta la variable ${variable} en backend/.env (necesaria para las pruebas E2E).`,
    );
  }
  return { correo, password };
}

// Escribe correo y contraseña en el formulario de /login y lo envía.
export async function llenarLogin(page: Page, correo: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/^Correo electrónico/).fill(correo);
  // /^Contraseña/ y no "Contraseña": el botón "Mostrar contraseña" también
  // tiene esa palabra en su nombre accesible.
  const campo = page.getByLabel(/^Contraseña/);
  await expect(campo).toBeEditable();
  // EXCEPCIÓN JUSTIFICADA a fill(): el reporte HTML guarda cada fill como
  // `Fill "<valor>"`, así que la contraseña real quedaría escrita en un
  // archivo que se sube al repo. Aquí el valor se pone con el setter nativo
  // del input + evento "input" (lo que escucha React Hook Form); el reporte
  // solo muestra "Evaluate", sin argumentos. El campo se sigue ubicando por
  // su etiqueta y el envío es un clic real.
  await campo.evaluate((input, valor) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, valor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

// Inicia sesión con un usuario del seed y espera el Inicio del dashboard.
export async function iniciarSesion(page: Page, rol: RolPrueba) {
  const { correo, password } = credenciales(rol);
  await llenarLogin(page, correo, password);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
}
