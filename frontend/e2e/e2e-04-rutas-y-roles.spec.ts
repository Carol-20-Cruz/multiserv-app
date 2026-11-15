import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./apoyo/sesion";

// E2E-04 — RUTAS PROTEGIDAS Y ROLES (SWR-AUTH-008 con AJ-03).
// Sin sesión no se ve ninguna página del dashboard; el Técnico no tiene
// Inventario ni en el menú, ni por URL, ni por la API.
test(
  "E2E-04 Rutas y roles: sin sesión va a /login; el Técnico no accede a Inventario",
  {
    tag: ["@SWR-AUTH-008"],
    annotation: [
      { type: "SWR", description: "SWR-AUTH-008 permisos por rol (AJ-03: Inventario solo Dueño)" },
    ],
  },
  async ({ page }) => {
    await test.step("Sin sesión: /ordenes y /clientes redirigen a /login", async () => {
      await page.goto("/ordenes");
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();

      await page.goto("/clientes");
      await expect(page).toHaveURL(/\/login$/);
    });

    await test.step("Técnico: el menú no tiene Inventario", async () => {
      await iniciarSesion(page, "TECNICO");
      const menu = page.getByRole("navigation", { name: "Menú principal" });
      await expect(menu.getByRole("link", { name: "Órdenes" })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Clientes" })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Inventario" })).toHaveCount(0);
    });

    await test.step("Técnico: /inventario lo devuelve al Inicio", async () => {
      await page.goto("/inventario");
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
    });

    await test.step("Técnico: la API de repuestos responde 403", async () => {
      const res = await page.request.get("/api/repuestos");
      expect(res.status()).toBe(403);
    });
  },
);
