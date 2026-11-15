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

// E2E-02 — FLUJO PRINCIPAL CON BLOQUEOS (rol Técnico), del login al
// resultado final: orden lista que NO se puede entregar con saldo.
// Cada bloqueo se comprueba dos veces:
//   1. En pantalla: botón deshabilitado + mensaje que explica por qué.
//   2. En el servidor: la misma acción pedida directo a la API (con la
//      sesión del Técnico) responde 409 con el motivo. Así se demuestra que
//      la regla no es solo un botón escondido.
test(
  "E2E-02 Técnico: sin abono no pasa a reparación y con saldo no se entrega (pantalla y API)",
  {
    tag: ["@flujo-principal", "@AJ-10", "@SWR-ORD-011", "@SWR-ENT-003"],
    annotation: [
      { type: "SWR", description: "AJ-10 / SWR-ORD-011 abono mínimo para pasar a reparación" },
      { type: "SWR", description: "SWR-ENT-003 no se entrega con saldo pendiente" },
    ],
  },
  async ({ page }) => {
    const sufijo = sufijoUnico();
    let ordenId = 0;

    await test.step("Iniciar sesión como Técnico", async () => {
      await iniciarSesion(page, "TECNICO");
    });

    await test.step("Registrar cliente, equipo y orden", async () => {
      await registrarCliente(page, `Cliente E2E-02 ${sufijo}`);
      await agregarEquipo(page, `MarcaE2E02-${sufijo}`);
      ordenId = await crearOrdenDesdeFicha(page, `Prueba E2E-02 ${sufijo}: hace ruido`);
    });

    await test.step("Diagnóstico y cotización de $ 200.000", async () => {
      await pasarA(page, "En diagnóstico");
      await registrarCotizacion(page, "Rodamiento gastado (dato ficticio E2E)", "200000");
    });

    await test.step("BLOQUEO 1 en pantalla: sin abono no pasa a reparación (AJ-10)", async () => {
      await expect(page.getByRole("button", { name: "Pasar a «En reparación»" })).toBeDisabled();
      await expect(
        page.getByText(/Falta el abono mínimo para pasar a reparación.*mínimo \$\s100\.000; pagado \$\s0/),
      ).toBeVisible();
    });

    await test.step("BLOQUEO 1 en el servidor: la API responde 409 FALTA_ABONO", async () => {
      const res = await page.request.post(`/api/ordenes/${ordenId}/estado`, {
        data: { estadoNuevo: "EN_REPARACION", comentario: null },
      });
      expect(res.status()).toBe(409);
      expect(await res.json()).toMatchObject({ motivo: "FALTA_ABONO" });
    });

    await test.step("Abonar el 50 % y pasar a reparación y a listo", async () => {
      await page.reload(); // la orden no cambió con el intento rechazado
      await registrarPago(page, "100000", /Queda registrado como abono/);
      await pasarA(page, "En reparación");
      await pasarA(page, "Listo para entrega");
    });

    await test.step("BLOQUEO 2 en pantalla: con saldo no se entrega (SWR-ENT-003)", async () => {
      await expect(page.getByRole("button", { name: "Entregar equipo" })).toBeDisabled();
      await expect(
        page.getByText(/Saldo pendiente \$\s100\.000: no se puede entregar/),
      ).toBeVisible();
    });

    await test.step("BLOQUEO 2 en el servidor: la API responde 409 SALDO_PENDIENTE", async () => {
      const res = await page.request.post(`/api/ordenes/${ordenId}/entregar`, {
        data: { recibidoPorNombre: `Recibe E2E-02 ${sufijo}` },
      });
      expect(res.status()).toBe(409);
      expect(await res.json()).toMatchObject({ motivo: "SALDO_PENDIENTE" });
    });

    await test.step("Resultado final: la orden sigue lista y sin entregar", async () => {
      await page.reload();
      await expect(page.getByText(/El equipo está listo/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Entregar equipo" })).toBeDisabled();
      await expect(page.getByText("Garantía hasta", { exact: true })).toHaveCount(0);
    });
  },
);
