import { expect, test } from "@playwright/test";
import { sufijoUnico } from "./apoyo/datos";
import { iniciarSesion } from "./apoyo/sesion";

// E2E-05 — INVENTARIO Y ALERTA DE STOCK BAJO (SWR-INV-001, SWR-INV-009).
// Se revisa la fila del repuesto creado (buscado por su referencia única),
// no el total de la alerta: el total cambia con otros datos de la base.
test(
  "E2E-05 Inventario: repuesto con stock = mínimo sale en la alerta; tras una entrada sale de ella",
  {
    tag: ["@SWR-INV-001", "@SWR-INV-009"],
    annotation: [
      { type: "SWR", description: "SWR-INV-001 registrar repuesto" },
      { type: "SWR", description: "SWR-INV-009 alerta de stock bajo (cantidad <= mínimo)" },
    ],
  },
  async ({ page }) => {
    const sufijo = sufijoUnico();
    const nombre = `Repuesto E2E-05 ${sufijo}`;
    const referencia = `E2E05-${sufijo}`.toUpperCase();
    const fila = page.getByRole("row").filter({ hasText: referencia });

    await test.step("Iniciar sesión como Dueño", async () => {
      await iniciarSesion(page, "DUENO");
    });

    await test.step("Registrar repuesto con cantidad 2 y mínimo 2 (SWR-INV-001)", async () => {
      await page.goto("/inventario/nuevo");
      await page.getByLabel("Nombre del repuesto").fill(nombre);
      await page.getByLabel("Referencia").fill(referencia);
      await page.getByLabel("Marca compatible").fill("Marca ficticia E2E");
      await page.getByLabel("Tipo de equipo").click();
      await page.getByRole("option").first().click();
      await page.getByLabel("Precio de venta (COP)").fill("50000");
      await page.getByLabel("Cantidad inicial").fill("2");
      await page.getByLabel("Cantidad mínima (alerta)").fill("2");
      await expect(page.getByText(/quedará con existencia baja/)).toBeVisible();
      await page.getByRole("button", { name: "Registrar repuesto" }).click();

      await expect(page).toHaveURL(/\/inventario\/\d+/);
      // Filtrado por texto: Next también pone un role="alert" vacío (el
      // anunciador de cambios de ruta).
      await expect(
        page.getByRole("alert").filter({ hasText: "Existencia baja: quedan 2 y el mínimo es 2." }),
      ).toBeVisible();
    });

    await test.step("La fila del repuesto aparece en el filtro de stock bajo (SWR-INV-009)", async () => {
      await page.goto(`/inventario?buscar=${referencia}&soloStockBajo=1`);
      await expect(page.getByRole("alert").filter({ hasText: /con existencia baja/ })).toBeVisible();
      await expect(fila).toBeVisible();
      await expect(fila.getByText("Stock bajo")).toBeVisible();
    });

    await test.step("Registrar entrada de 5 unidades", async () => {
      await fila.getByRole("link").first().click();
      await expect(page).toHaveURL(/\/inventario\/\d+/);
      await page.getByRole("button", { name: "Registrar entrada" }).click();
      const dialogo = page.getByRole("dialog");
      await dialogo.getByLabel("Cantidad que llegó").fill("5");
      await dialogo.getByLabel("Proveedor").fill("Proveedor ficticio E2E");
      await dialogo.getByRole("button", { name: "Registrar entrada" }).click();
      await expect(dialogo).toBeHidden();
      await expect(page.getByText(/Existencia baja/)).toHaveCount(0);
    });

    await test.step("La fila ya no está en el filtro de stock bajo ni tiene la etiqueta", async () => {
      await page.goto(`/inventario?buscar=${referencia}&soloStockBajo=1`);
      await expect(fila).toHaveCount(0);

      await page.goto(`/inventario?buscar=${referencia}`);
      await expect(fila).toBeVisible();
      await expect(fila.getByText("Stock bajo")).toHaveCount(0);
    });
  },
);
