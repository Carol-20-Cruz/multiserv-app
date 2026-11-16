import { reenviarAlBackend } from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// GET /api/clientes?buscar= — selector de cliente de la orden nueva.
// Solo se reenvía el texto a buscar (máximo 100 caracteres).
export function GET(request: NextRequest) {
  const buscar = (request.nextUrl.searchParams.get("buscar") ?? "")
    .trim()
    .slice(0, 100);
  const params = new URLSearchParams({ pagina: "1" });
  if (buscar) params.set("buscar", buscar);
  return reenviarAlBackend(request, `/clientes?${params.toString()}`, "GET");
}

// POST /api/clientes — registrar cliente (SWR-CLI-001, 003, 004 / AJ-04).
export function POST(request: NextRequest) {
  return reenviarAlBackend(request, "/clientes", "POST");
}
