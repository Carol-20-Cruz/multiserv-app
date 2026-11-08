import "server-only";

import type { NextRequest } from "next/server";

// Defensa extra contra CSRF en las rutas /api/auth: si el navegador envía
// el encabezado Origin, debe ser el mismo sitio que atiende la petición.
export function esMismoOrigen(request: NextRequest): boolean {
  const origen = request.headers.get("origin");
  return origen === null || origen === request.nextUrl.origin;
}
