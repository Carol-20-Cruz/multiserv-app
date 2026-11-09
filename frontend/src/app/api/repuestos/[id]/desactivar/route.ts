import {
  idValido,
  reenviarAlBackend,
  respuestaNoEncontrado,
} from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// PATCH /api/repuestos/:id/desactivar — se desactiva, no se borra.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado("Repuesto no encontrado");
  return reenviarAlBackend(request, `/repuestos/${id}/desactivar`, "PATCH");
}
