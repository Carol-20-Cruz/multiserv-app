import {
  idValido,
  reenviarAlBackend,
  respuestaNoEncontrado,
} from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// GET /api/clientes/:id — detalle con sus equipos (selector de la orden nueva).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado();
  return reenviarAlBackend(request, `/clientes/${id}`, "GET");
}

// PATCH /api/clientes/:id — editar datos de contacto.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado();
  return reenviarAlBackend(request, `/clientes/${id}`, "PATCH");
}
