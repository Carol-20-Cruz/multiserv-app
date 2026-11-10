// Número de orden MS-AAAA-NNNNN — funciones puras (sin base de datos),
// para probarlas con pruebas unitarias y de caja blanca.
//
// SWR-ORD-002: número único con el año y un consecutivo de 5 dígitos.
// AJ-06: el consecutivo vuelve a 00001 cada año (MS-2026-00001, MS-2027-00001).
// El año es el de Colombia (UTC−5, sin horario de verano): una orden creada
// el 31/12 a las 11 p. m. en Neiva es del año que termina, aunque en UTC ya
// sea 1 de enero.

export const PREFIJO_ORDEN = 'MS';
export const CONSECUTIVO_MAXIMO = 99999; // 5 dígitos

const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000; // UTC−5

const esEnteroEntre = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;

// Año calendario de Colombia para una fecha (instante) dada.
export function anioColombia(fecha: Date): number {
  // Camino 1: fecha inválida (new Date('xyz')). Error de programación.
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new RangeError('La fecha no es válida');
  }
  // Camino 2: se corre el instante 5 horas y se lee el año en UTC.
  return new Date(fecha.getTime() - DESFASE_COLOMBIA_MS).getUTCFullYear();
}

// (2026, 1) -> "MS-2026-00001".
export function formatearNumeroOrden(
  anio: number,
  consecutivo: number,
): string {
  // Camino 1: año que no tiene 4 dígitos.
  if (!esEnteroEntre(anio, 1000, 9999)) {
    throw new RangeError('El año debe ser un entero de 4 dígitos');
  }
  // Camino 2: consecutivo fuera de 00001..99999 (ya no cabría en 5 dígitos).
  if (!esEnteroEntre(consecutivo, 1, CONSECUTIVO_MAXIMO)) {
    throw new RangeError(
      `El consecutivo debe ser un entero entre 1 y ${CONSECUTIVO_MAXIMO}`,
    );
  }
  // Camino 3: válido.
  return `${PREFIJO_ORDEN}-${anio}-${String(consecutivo).padStart(5, '0')}`;
}
