import { expect, test } from "@playwright/test";
import { sufijoUnico } from "./apoyo/datos";
import {
  agregarEquipo,
  crearOrdenDesdeFicha,
  pasarA,
  registrarCliente,
  registrarCotizacion,
  registrarPago,
} from "./apoyo/flujo";
import { iniciarSesion } from "./apoyo/sesion";

// E2E-01 — FLUJO PRINCIPAL COMPLETO (rol Dueño), del login al resultado
// final: equipo entregado con garantía.
// Cotización $ 200.000 con abono del 50 %: abono $ 100.000 + saldo $ 100.000.
test(
  "E2E-01 Dueño: login → cliente → equipo → orden → cotización → abono → reparación → pago del saldo → entrega con garantía",
  {
    tag: ["@flujo-principal", "@SWR-ORD-001", "@SWR-ORD-011", "@SWR-PAY-004", "@SWR-ENT-003"],
    annotation: [
      { type: "SWR", description: "SWR-ORD-001 registrar orden de servicio" },
      { type: "SWR", description: "SWR-ORD-011 secuencia de estados" },
      { type: "SWR", description: "SWR-PAY-004 cotización, abono y pago del saldo" },
      { type: "SWR", description: "SWR-ENT-003 entrega con saldo en cero y garantía" },
    ],
  },
  async ({ page }) => {
    const sufijo = sufijoUnico();
    const nombreCliente = `Cliente E2E-01 ${sufijo}`;
    const marca = `MarcaE2E01-${sufijo}`;

    await test.step("Iniciar sesión como Dueño", async () => {
      await iniciarSesion(page, "DUENO");
    });

    await test.step("Registrar cliente", async () => {
      await registrarCliente(page, nombreCliente);
    });

    await test.step("Agregar equipo al cliente", async () => {
      await agregarEquipo(page, marca);
    });

    await test.step("Crear la orden de servicio (SWR-ORD-001)", async () => {
      await crearOrdenDesdeFicha(page, `Prueba E2E-01 ${sufijo}: no enciende`);
      await expect(page.getByText("Recibido").first()).toBeVisible();
    });

    await test.step("Pasar a diagnóstico (SWR-ORD-011)", async () => {
      await pasarA(page, "En diagnóstico");
    });

    await test.step("Registrar cotización de $ 200.000", async () => {
      await registrarCotizacion(page, "Tarjeta principal dañada (dato ficticio E2E)", "200000");
      await expect(page.getByText(/\$\s200\.000/).first()).toBeVisible();
      await expect(page.getByText(/\$\s100\.000/).first()).toBeVisible(); // abono mínimo 50 %
    });

    await test.step("Registrar abono del 50 % (SWR-PAY-004)", async () => {
      await registrarPago(page, "100000", /Queda registrado como abono/);
    });

    await test.step("Pasar a reparación y a listo para entrega", async () => {
      await pasarA(page, "En reparación");
      await pasarA(page, "Listo para entrega");
      await expect(page.getByText(/El equipo está listo/)).toBeVisible();
    });

    await test.step("Pagar el saldo pendiente", async () => {
      await registrarPago(page, "100000", /Cubre todo el saldo/);
      await expect(page.getByRole("button", { name: "Entregar equipo" })).toBeEnabled();
    });

    await test.step("Entregar el equipo (SWR-ENT-003)", async () => {
      await page.getByRole("button", { name: "Entregar equipo" }).click();
      const dialogo = page.getByRole("dialog");
      await dialogo.getByLabel("Recibido por").fill(`Recibe E2E-01 ${sufijo}`);
      await dialogo.getByRole("button", { name: "Confirmar entrega" }).click();
      await expect(dialogo).toBeHidden();
      await expect(page.getByText("Equipo entregado correctamente.")).toBeVisible();
    });

    await test.step("Ver la garantía en la tarjeta «Cuenta»", async () => {
      await expect(page.getByText("La orden ya fue entregada: su estado no cambia.")).toBeVisible();
      await expect(page.getByText("Entregada", { exact: true })).toBeVisible();
      await expect(page.getByText(`Recibe E2E-01 ${sufijo}`)).toBeVisible();
      await expect(page.getByText("Entregó", { exact: true })).toBeVisible();
      // Etiqueta "Garantía hasta" y, junto a ella, la fecha a las 11:59 p. m.
      const garantia = page.getByText("Garantía hasta", { exact: true }).locator("..");
      await expect(garantia).toContainText(/11:59\sp\.\s?m\./);
    });
  },
);
