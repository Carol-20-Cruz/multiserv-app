import {
  idValido,
  reenviarAlBackend,
  respuestaNoEncontrado,
} from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// POST /api/repuestos/:id/entradas — registrar repuestos que llegan.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado("Repuesto no encontrado");
  return reenviarAlBackend(request, `/repuestos/${id}/entradas`, "POST");
}
