// Abono mínimo — función pura (sin base de datos).
//
// La dueña confirmó (validación 08/11/2026): 50 % de abono al aprobar la
// cotización y el resto al recoger. El porcentaje sale de Configuracion y
// queda copiado en la orden (SWR-DATA-003). AJ-10: el abono mínimo es
// requisito para pasar a EN_REPARACION.
//
// Pesos sin decimales (SWR-CON-003): se redondea HACIA ARRIBA, para que el
// taller nunca reciba menos del porcentaje. 180.001 al 50 % -> 90.001.

const esEntero = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n);

export function abonoMinimo(valorCotizado: number, porcentaje: number): number {
  // Camino 1: valor cotizado imposible (0, negativo, decimal).
  if (!esEntero(valorCotizado) || valorCotizado < 1) {
    throw new RangeError('El valor cotizado debe ser un entero de 1 o más');
  }
  // Camino 2: porcentaje fuera de 0..100.
  if (!esEntero(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    throw new RangeError(
      'El porcentaje de abono debe ser un entero de 0 a 100',
    );
  }
  // Camino 3: techo entero de valor × % / 100, sin pasar por decimales.
  return Math.floor((valorCotizado * porcentaje + 99) / 100);
}
