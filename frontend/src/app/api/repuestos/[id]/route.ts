import {
  idValido,
  reenviarAlBackend,
  respuestaNoEncontrado,
} from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

type Contexto = { params: Promise<{ id: string }> };

// GET /api/repuestos/:id — detalle con los últimos movimientos.
export async function GET(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado("Repuesto no encontrado");
  return reenviarAlBackend(request, `/repuestos/${id}`, "GET");
}

// PATCH /api/repuestos/:id — editar datos y mínimo (la cantidad no).
export async function PATCH(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado("Repuesto no encontrado");
  return reenviarAlBackend(request, `/repuestos/${id}`, "PATCH");
}
