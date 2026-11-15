import { expect, test } from "@playwright/test";
import { credenciales, llenarLogin } from "./apoyo/sesion";

// E2E-03 — LOGIN (SWR-AUTH-001, mensaje genérico SWR-AUTH-003).
// Un solo intento fallido y luego el correcto: el login correcto pone el
// contador de intentos en 0 (AJ-02), así la prueba nunca bloquea la cuenta
// aunque se repita muchas veces.
test(
  "E2E-03 Login: contraseña incorrecta muestra el mensaje y no entra; la correcta entra",
  {
    tag: ["@SWR-AUTH-001", "@SWR-AUTH-003"],
    annotation: [
      { type: "SWR", description: "SWR-AUTH-001 inicio de sesión con correo y contraseña" },
      { type: "SWR", description: "SWR-AUTH-003 mensaje genérico ante credenciales inválidas" },
    ],
  },
  async ({ page }) => {
    const { correo, password } = credenciales("DUENO");

    await test.step("Contraseña incorrecta: mensaje y sigue en /login", async () => {
      await llenarLogin(page, correo, "clave-incorrecta-E2E");
      // Filtrado por texto: Next también pone un role="alert" vacío (el
      // anunciador de cambios de ruta para lectores de pantalla).
      await expect(
        page.getByRole("alert").filter({ hasText: "Credenciales inválidas" }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
    });

    await test.step("Contraseña correcta: entra al Inicio", async () => {
      await llenarLogin(page, correo, password);
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    });
  },
);
