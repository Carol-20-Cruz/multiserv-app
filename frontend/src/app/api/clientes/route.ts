import { reenviarAlBackend } from "@/lib/backend-sesion";
import type { NextRequest } from "next/server";

// POST /api/clientes — registrar cliente (SWR-CLI-001, 003, 004 / AJ-04).
export function POST(request: NextRequest) {
  return reenviarAlBackend(request, "/clientes", "POST");
}
