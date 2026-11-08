import { esMismoOrigen } from "@/lib/mismo-origen";
import { COOKIE_SESION } from "@/lib/tipos-sesion";
import { NextResponse, type NextRequest } from "next/server";

// POST /api/auth/logout — borra la cookie de sesión y vuelve al login.
// Lo usa el formulario "Cerrar sesión" del header (funciona sin JavaScript).
export async function POST(request: NextRequest) {
  if (!esMismoOrigen(request)) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }

  const respuesta = NextResponse.redirect(new URL("/login", request.url), 303);
  respuesta.cookies.delete(COOKIE_SESION);
  return respuesta;
}
