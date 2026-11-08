import "server-only";

import { cookies } from "next/headers";
import { llamarBackend } from "./backend";
import { COOKIE_SESION, type Usuario } from "./tipos-sesion";

// Opciones de la cookie que guarda el JWT:
// - httpOnly: el JavaScript del navegador no puede leerla (protege de XSS).
// - sameSite "lax": no viaja en POST desde otros sitios (protege de CSRF).
// - secure en producción: solo por HTTPS.
export function opcionesCookie(maxAgeSegundos: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSegundos,
  };
}

const OCHO_HORAS = 8 * 60 * 60;

// Segundos que le quedan al token, leyendo su campo "exp" (sin verificar la
// firma: eso lo hace el backend). Si no se puede leer, 8 horas.
export function segundosRestantes(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    if (payload.exp) {
      return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    }
  } catch {
    // token con formato inesperado
  }
  return OCHO_HORAS;
}

// Usuario de la sesión actual según el backend (GET /auth/perfil).
// Devuelve null si no hay cookie o si el backend rechaza el token (401).
export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return null;

  const res = await llamarBackend("/auth/perfil", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status} al consultar el perfil`);
  }
  return (await res.json()) as Usuario;
}
