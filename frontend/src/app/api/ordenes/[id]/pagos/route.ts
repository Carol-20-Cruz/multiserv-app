import {
  idValido,
  reenviarAlBackend,
  respuestaNoEncontrado,
} from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// POST /api/ordenes/:id/pagos — registrar un abono o el saldo
// (SWR-PAY-004). El 409 llega tal cual, con su mensaje y su motivo.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idValido(id)) return respuestaNoEncontrado("Orden no encontrada");
  return reenviarAlBackend(request, `/ordenes/${id}/pagos`, "POST");
}
