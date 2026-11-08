import { reenviarAlBackend } from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// GET /api/clientes/verificar-telefono?telefono= — SWR-CLI-004 / AJ-04:
// el formulario pregunta si el teléfono ya existe ANTES de enviar.
export function GET(request: NextRequest) {
  const telefono = request.nextUrl.searchParams.get("telefono") ?? "";
  return reenviarAlBackend(
    request,
    `/clientes/verificar-telefono?telefono=${encodeURIComponent(telefono)}`,
    "GET",
  );
}
