import { COOKIE_SESION } from "@/lib/tipos-sesion";
import { NextResponse, type NextRequest } from "next/server";

// GET /api/auth/expirada — a esta ruta redirige el layout del dashboard
// cuando el backend rechaza el token (vencido o inválido). Borra la cookie
// (un Server Component no puede hacerlo) y lleva al login.
export async function GET(request: NextRequest) {
  const respuesta = NextResponse.redirect(new URL("/login", request.url));
  respuesta.cookies.delete(COOKIE_SESION);
  return respuesta;
}
