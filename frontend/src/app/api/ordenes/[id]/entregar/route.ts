import {
  idValido,
  reenviarAlBackend,
  respuestaNoEncontrado,
} from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// POST /api/ordenes/:id/entregar — entregar el equipo (SWR-ENT-003). Con
// saldo pendiente el backend responde 409 SALDO_PENDIENTE.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado("Orden no encontrada");
  return reenviarAlBackend(request, `/ordenes/${id}/entregar`, "POST");
}
