import { expect, type Page } from "@playwright/test";
import { idDesdeUrl, telefonoUnico } from "./datos";

// Pasos de pantalla que comparten los flujos principales (E2E-01 y E2E-02).
// Solo locators semánticos (rol, etiqueta, texto) y aserciones que esperan
// solas: ningún waitForTimeout.

// SWR-CLI: registrar un cliente ficticio. Devuelve su id.
export async function registrarCliente(page: Page, nombre: string) {
  await page.goto("/clientes/nuevo");
  await page.getByLabel("Nombre completo").fill(nombre);
  // Por rol y nombre accesible exacto: "Teléfono alterno" también contiene
  // la palabra, y el texto de la etiqueta lleva el " *" de obligatorio.
  await page
    .getByRole("textbox", { name: "Teléfono", exact: true })
    .fill(telefonoUnico());
  await page
    .getByRole("checkbox", { name: /autoriza el tratamiento de sus datos/ })
    .check();
  await page.getByRole("button", { name: "Registrar cliente" }).click();

  await expect(page).toHaveURL(/\/clientes\/\d+/);
  await expect(page.getByText("Cliente registrado correctamente.")).toBeVisible();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  return idDesdeUrl(page.url(), "clientes");
}

// SWR-EQP-003: en la ficha del cliente, agregar un equipo (el primer tipo de
// la lista) con una marca ficticia.
export async function agregarEquipo(page: Page, marca: string) {
  await page.getByLabel("Tipo de equipo").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Marca").fill(marca);
  await page.getByRole("button", { name: "Agregar equipo" }).click();

  await expect(page.getByText(`${marca}.`, { exact: false })).toBeVisible();
  await expect(page.getByRole("cell", { name: marca, exact: true })).toBeVisible();
}

// SWR-ORD-001: desde la fila del equipo, "Nueva orden" (cliente y equipo ya
// elegidos) -> falla reportada -> crear. Devuelve el id de la orden.
export async function crearOrdenDesdeFicha(page: Page, falla: string) {
  await page.getByRole("link", { name: /^Nueva orden/ }).click();
  await expect(page).toHaveURL(/\/ordenes\/nueva/);
  await page.getByLabel("Falla reportada").fill(falla);
  await page.getByRole("button", { name: "Crear orden" }).click();

  await expect(page).toHaveURL(/\/ordenes\/\d+/);
  await expect(page.getByText("Orden creada correctamente.")).toBeVisible();
  return idDesdeUrl(page.url(), "ordenes");
}

// SWR-ORD-011: "Pasar a «X»" -> confirmar. Espera a que el diálogo se cierre
// y el estado nuevo quede en la página.
export async function pasarA(page: Page, estado: string) {
  await page.getByRole("button", { name: `Pasar a «${estado}»` }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole("button", { name: "Confirmar cambio" }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByText("Estado actualizado correctamente.")).toBeVisible();
}

// SWR-PAY-004: registrar la cotización aprobada (diagnóstico + valor).
export async function registrarCotizacion(
  page: Page,
  diagnostico: string,
  valor: string,
) {
  await page.getByRole("button", { name: "Registrar cotización" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Diagnóstico").fill(diagnostico);
  await dialogo.getByLabel("Valor aprobado (pesos)").fill(valor);
  await dialogo.getByRole("button", { name: "Guardar cotización" }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByText("Cotización guardada correctamente.")).toBeVisible();
}

// SWR-PAY-004: registrar un pago en efectivo. `tipo` es el texto de ayuda que
// muestra el diálogo según el valor ("abono" o "pago del saldo").
export async function registrarPago(
  page: Page,
  valor: string,
  tipo: RegExp,
) {
  await page.getByRole("button", { name: "Registrar pago" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Valor (pesos)").fill(valor);
  await expect(dialogo.getByText(tipo)).toBeVisible();
  await dialogo.getByRole("radio", { name: "Efectivo" }).check();
  await dialogo.getByRole("button", { name: "Guardar pago" }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByText("Pago registrado correctamente.")).toBeVisible();
}
