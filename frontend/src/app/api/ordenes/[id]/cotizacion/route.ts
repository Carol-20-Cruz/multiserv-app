import {
  idValido,
  reenviarAlBackend,
  respuestaNoEncontrado,
} from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// PUT /api/ordenes/:id/cotizacion — registrar o corregir la cotización
// aprobada (SWR-PAY-004, AJ-09).
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado("Orden no encontrada");
  return reenviarAlBackend(request, `/ordenes/${id}/cotizacion`, "PUT");
}
