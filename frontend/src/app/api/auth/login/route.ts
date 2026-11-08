import { llamarBackend, MENSAJE_SIN_CONEXION, mensajeDeError } from "@/lib/backend";
import { esMismoOrigen } from "@/lib/mismo-origen";
import { opcionesCookie, segundosRestantes } from "@/lib/sesion";
import { COOKIE_SESION, type Usuario } from "@/lib/tipos-sesion";
import { NextResponse, type NextRequest } from "next/server";

interface RespuestaLoginBackend {
  accessToken: string;
  usuario: Usuario;
}

// POST /api/auth/login
// Reenvía las credenciales al backend. Si son válidas guarda el JWT en una
// cookie httpOnly y al navegador solo le devuelve los datos del usuario.
// Si no, responde con el mismo código y mensaje del backend (401, 423, 400).
export async function POST(request: NextRequest) {
  if (!esMismoOrigen(request)) {
    return NextResponse.json({ message: "Origen no permitido" }, { status: 403 });
  }

  let credenciales: { correo?: unknown; password?: unknown };
  try {
    credenciales = await request.json();
  } catch {
    return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await llamarBackend("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: credenciales.correo,
        password: credenciales.password,
      }),
    });
  } catch {
    return NextResponse.json({ message: MENSAJE_SIN_CONEXION }, { status: 503 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { message: await mensajeDeError(res) },
      { status: res.status },
    );
  }

  const { accessToken, usuario } = (await res.json()) as RespuestaLoginBackend;
  const respuesta = NextResponse.json({ usuario });
  respuesta.cookies.set(
    COOKIE_SESION,
    accessToken,
    opcionesCookie(segundosRestantes(accessToken)),
  );
  return respuesta;
}
