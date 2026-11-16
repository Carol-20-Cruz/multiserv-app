import { reenviarAlBackend } from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// GET /api/clientes/verificar-telefono?telefono=&excluir= — SWR-CLI-004 /
// AJ-04: el formulario pregunta si el teléfono ya existe ANTES de enviar.
// excluir (opcional): id del cliente que se está editando.
export function GET(request: NextRequest) {
  const consulta = request.nextUrl.searchParams;
  const params = new URLSearchParams({
    telefono: consulta.get("telefono") ?? "",
  });
  const excluir = consulta.get("excluir");
  if (excluir && /^\d{1,9}$/.test(excluir)) params.set("excluir", excluir);

  return reenviarAlBackend(
    request,
    `/clientes/verificar-telefono?${params.toString()}`,
    "GET",
  );
}
