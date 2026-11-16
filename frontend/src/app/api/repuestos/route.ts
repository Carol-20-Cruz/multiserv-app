import { reenviarAlBackend } from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// Inventario de repuestos — solo Dueño (AJ-03). El backend responde 403 al
// Técnico; esta ventanilla solo reenvía con la llave de la sesión.

// GET /api/repuestos?buscar=&tipoEquipoId=&soloStockBajo=&pagina=
export function GET(request: NextRequest) {
  return reenviarAlBackend(
    request,
    `/repuestos${request.nextUrl.search}`,
    "GET",
  );
}

// POST /api/repuestos — registrar repuesto (SWR-INV-001 + AJ-05).
export function POST(request: NextRequest) {
  return reenviarAlBackend(request, "/repuestos", "POST");
}
