import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "./lib/tipos-sesion";

// Portero de la entrada: corre antes de cada página.
// - Sin cookie de sesión  -> cualquier página redirige a /login.
// - Con cookie y en /login -> redirige al inicio.
// Solo revisa que la cookie exista; la validez real del token la comprueba
// el layout del dashboard preguntando al backend (GET /auth/perfil).
export function proxy(request: NextRequest) {
  const tieneSesion = request.cookies.has(COOKIE_SESION);
  const enLogin = request.nextUrl.pathname === "/login";

  if (!tieneSesion && !enLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (tieneSesion && enLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Todas las rutas excepto /api, archivos internos de Next y archivos con
  // extensión (imágenes, favicon, etc.).
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
