// Reglas del teléfono del cliente — funciones puras (sin base de datos),
// para probarlas con pruebas unitarias y de caja blanca.
//
// SWR-CLI-003: el teléfono debe tener EXACTAMENTE 10 dígitos numéricos.
// AJ-08: se aceptan espacios y guiones (300 123 4567, 300-123-4567); se
// quitan antes de validar. Cualquier otro carácter (letras, +, puntos...)
// lo hace inválido.

export const LONGITUD_TELEFONO = 10;

export type MotivoTelefonoInvalido =
  'VACIO' | 'CARACTERES_INVALIDOS' | 'LONGITUD';

export type ResultadoTelefono =
  | { valido: true; telefono: string }
  | { valido: false; motivo: MotivoTelefonoInvalido; mensaje: string };

export const MENSAJES_TELEFONO: Record<MotivoTelefonoInvalido, string> = {
  VACIO: 'El teléfono es obligatorio',
  CARACTERES_INVALIDOS: 'El teléfono solo puede tener números',
  LONGITUD: `El teléfono debe tener exactamente ${LONGITUD_TELEFONO} dígitos`,
};

// Quita espacios y guiones (AJ-08). No valida: solo limpia.
export function normalizarTelefono(valor: string): string {
  return valor.replace(/[\s-]/g, '');
}

export function validarTelefono(valor: unknown): ResultadoTelefono {
  // Camino 1: no llegó texto o solo trae espacios/guiones.
  const limpio = typeof valor === 'string' ? normalizarTelefono(valor) : '';
  if (limpio === '') {
    return invalido('VACIO');
  }

  // Camino 2: quedan caracteres que no son dígitos (letras, +, puntos...).
  if (!/^\d+$/.test(limpio)) {
    return invalido('CARACTERES_INVALIDOS');
  }

  // Camino 3: dígitos de más o de menos.
  if (limpio.length !== LONGITUD_TELEFONO) {
    return invalido('LONGITUD');
  }

  // Camino 4: válido; se devuelve ya normalizado para guardarlo así.
  return { valido: true, telefono: limpio };
}

function invalido(motivo: MotivoTelefonoInvalido): ResultadoTelefono {
  return { valido: false, motivo, mensaje: MENSAJES_TELEFONO[motivo] };
}
