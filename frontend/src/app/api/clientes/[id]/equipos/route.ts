import {
  idValido,
  reenviarAlBackend,
  respuestaNoEncontrado,
} from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// POST /api/clientes/:id/equipos — SWR-EQP-003.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado();
  return reenviarAlBackend(request, `/clientes/${id}/equipos`, "POST");
}
