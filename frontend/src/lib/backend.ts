import "server-only";

// URL del backend NestJS. Solo la usa el servidor de Next (no lleva el
// prefijo NEXT_PUBLIC_, así no se incluye en el código del navegador).
export const API_URL = process.env.API_URL ?? "http://localhost:3001";

export const MENSAJE_SIN_CONEXION = "No se pudo conectar con el servidor";

// Llama al backend sin caché. Lanza error si el backend no responde.
export function llamarBackend(ruta: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${ruta}`, { ...init, cache: "no-store" });
}

// Extrae un mensaje legible de una respuesta de error de NestJS
// ({ message: string } o { message: string[] } en errores de validación).
export async function mensajeDeError(res: Response): Promise<string> {
  try {
    const cuerpo = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(cuerpo.message)) return cuerpo.message[0] ?? "Solicitud inválida";
    if (cuerpo.message) return cuerpo.message;
  } catch {
    // respuesta sin JSON
  }
  return "Ocurrió un error inesperado";
}
