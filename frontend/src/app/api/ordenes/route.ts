import { reenviarAlBackend } from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// POST /api/ordenes — crear orden de servicio (SWR-ORD-001, SWR-ORD-002).
export function POST(request: NextRequest) {
  return reenviarAlBackend(request, "/ordenes", "POST");
}
