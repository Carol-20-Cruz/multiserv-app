import "server-only";

import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "./sesion";

// AJ-03: inventario es solo del Dueño. Ocultar el menú no basta: si un
// Técnico escribe la URL, se le devuelve al inicio ANTES de pedir datos.
// La protección real de los datos la hace el backend (RolesGuard -> 403).
export async function exigirDueno(): Promise<void> {
  const usuario = await obtenerUsuarioActual();
  if (usuario?.rol !== "DUENO") redirect("/");
}
