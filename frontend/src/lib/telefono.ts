// Regla del teléfono en el navegador. Es la misma del backend
// (backend/src/clientes/reglas/telefono.ts): el navegador avisa rápido y el
// backend decide. Si cambia una, hay que cambiar la otra.
//
// SWR-CLI-003: exactamente 10 dígitos numéricos.
// AJ-08: se aceptan espacios y guiones; se quitan antes de validar.

export const LONGITUD_TELEFONO = 10;

export const MENSAJES_TELEFONO = {
  VACIO: "El teléfono es obligatorio",
  CARACTERES_INVALIDOS: "El teléfono solo puede tener números",
  LONGITUD: `El teléfono debe tener exactamente ${LONGITUD_TELEFONO} dígitos`,
} as const;

export function normalizarTelefono(valor: string): string {
  return valor.replace(/[\s-]/g, "");
}

// Devuelve el mensaje de error, o null si el teléfono es válido.
export function errorTelefono(valor: string): string | null {
  const limpio = normalizarTelefono(valor);
  if (limpio === "") return MENSAJES_TELEFONO.VACIO;
  if (!/^\d+$/.test(limpio)) return MENSAJES_TELEFONO.CARACTERES_INVALIDOS;
  if (limpio.length !== LONGITUD_TELEFONO) return MENSAJES_TELEFONO.LONGITUD;
  return null;
}

// Defecto 6: el alterno no puede ser el mismo número que el principal
// (comparados ya normalizados). Un alterno vacío nunca es "igual".
export const MENSAJE_ALTERNO_IGUAL =
  "El teléfono alterno debe ser diferente al principal";

export function alternoIgualAlPrincipal(
  principal: string,
  alterno: string,
): boolean {
  const alternoLimpio = normalizarTelefono(alterno);
  return (
    alternoLimpio !== "" && alternoLimpio === normalizarTelefono(principal)
  );
}

// "3001234567" -> "300 123 4567" (solo para mostrar).
export function formatearTelefono(telefono: string): string {
  return /^\d{10}$/.test(telefono)
    ? `${telefono.slice(0, 3)} ${telefono.slice(3, 6)} ${telefono.slice(6)}`
    : telefono;
}
