import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { llamarBackend, MENSAJE_SIN_CONEXION } from "./backend";
import { esMismoOrigen } from "./mismo-origen";
import { COOKIE_SESION } from "./tipos-sesion";

// La "llave" (JWT) vive en la cookie httpOnly: el navegador no la ve.
// Estas funciones corren en el servidor de Next, toman la llave y la
// presentan al backend en el encabezado Authorization.

// Para páginas (Server Components): GET al backend con la sesión.
// - 401 (token vencido): borra la cookie y lleva al login.
// - 404: devuelve null (la página muestra "no encontrado").
export async function obtenerDelBackend<T>(ruta: string): Promise<T | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) redirect("/api/auth/expirada");

  const res = await llamarBackend(ruta, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) redirect("/api/auth/expirada");
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status} en ${ruta}`);
  }
  return (await res.json()) as T;
}

// Para rutas /api (ventanilla): reenvía la petición del navegador al backend
// con la llave y devuelve la respuesta tal cual (código y cuerpo), así el
// navegador recibe por ejemplo el 409 con los datos del cliente existente.
export async function reenviarAlBackend(
  request: NextRequest,
  ruta: string,
  metodo: "GET" | "POST" | "PATCH" | "PUT",
): Promise<NextResponse> {
  if (!esMismoOrigen(request)) {
    return NextResponse.json(
      { message: "Origen no permitido" },
      { status: 403 },
    );
  }

  const token = request.cookies.get(COOKIE_SESION)?.value;
  if (!token) {
    return NextResponse.json({ message: "Sesión expirada" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await llamarBackend(ruta, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: metodo === "GET" ? undefined : await request.text(),
    });
  } catch {
    return NextResponse.json(
      { message: MENSAJE_SIN_CONEXION },
      { status: 503 },
    );
  }

  const cuerpo = await res.text();
  return new NextResponse(cuerpo || null, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

// Los ids de la URL deben ser números; si no, 404 sin molestar al backend.
export function idValido(id: string): boolean {
  return /^\d{1,9}$/.test(id);
}

export const respuestaNoEncontrado = (mensaje = "Cliente no encontrado") =>
  NextResponse.json({ message: mensaje }, { status: 404 });
