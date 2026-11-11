// Llamadas del navegador a las rutas /api de Next (las "ventanillas").
// Nunca llaman al backend directo: la llave (cookie httpOnly) la pone Next.

export interface RespuestaApi<T = unknown> {
  ok: boolean;
  status: number;
  cuerpo: T;
}

export const MENSAJE_SIN_CONEXION = "No se pudo conectar con el servidor";

export async function pedirApi<T = unknown>(
  url: string,
  metodo: "GET" | "POST" | "PATCH" | "PUT" = "GET",
  datos?: unknown,
): Promise<RespuestaApi<T>> {
  const res = await fetch(url, {
    method: metodo,
    headers:
      datos === undefined ? undefined : { "Content-Type": "application/json" },
    body: datos === undefined ? undefined : JSON.stringify(datos),
  });

  // Sesión vencida: la ruta /api/auth/expirada borra la cookie y lleva al login.
  if (res.status === 401) {
    // Es una ruta /api (no una página): hace falta navegación completa.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/auth/expirada");
  }

  const cuerpo = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, cuerpo };
}

// Mensaje legible de un error de NestJS ({ message: string | string[] }).
export function mensajeDeError(cuerpo: unknown, porDefecto: string): string {
  const message = (cuerpo as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) return message[0] ?? porDefecto;
  return message || porDefecto;
}

// Defecto 10: mensaje para un error al guardar. Las reglas de negocio
// (400, 409...) traen su propio mensaje y se muestran tal cual. Un error
// inesperado (5xx, o una respuesta sin "message", como la página 404 en
// HTML de Next) muestra un texto amigable, sin detalles técnicos.
export function mensajeAlGuardar(
  res: RespuestaApi,
  accion: string, // "registrar el pago"
): string {
  const inesperado = `Ocurrió un error al ${accion}. Intenta de nuevo y, si se repite, avisa al administrador.`;
  if (res.status >= 500) return inesperado;
  return mensajeDeError(res.cuerpo, inesperado);
}
