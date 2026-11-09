// Reglas del stock de repuestos — funciones puras (sin base de datos),
// para probarlas con pruebas unitarias y de caja blanca.
//
// SWR-INV-009: un repuesto está en "existencia baja" cuando su cantidad
// LLEGA o BAJA del mínimo (cantidad <= cantidadMinima). La dueña confirmó
// que le sirve la alerta (validación 08/11/2026). Mínimo 0 está permitido:
// en ese caso la alerta solo aparece cuando el stock llega a 0.

export type EstadoStock = { cantidad: number; minimo: number };

// Qué pasó con la alerta tras un cambio de stock o de mínimo.
export type CambioStock =
  | 'ENTRA_EN_BAJO' // antes estaba bien y ahora está bajo -> alertar
  | 'SIGUE_BAJO' // estaba bajo y sigue bajo
  | 'SALE_DE_BAJO' // estaba bajo y ya no
  | 'NORMAL'; // estaba bien y sigue bien

const esEnteroNoNegativo = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0;

export function esStockBajo(cantidad: number, minimo: number): boolean {
  // Camino 1: datos imposibles (negativos, decimales, NaN). No deberían
  // llegar desde la base; si llegan es un error de programación.
  if (!esEnteroNoNegativo(cantidad) || !esEnteroNoNegativo(minimo)) {
    throw new RangeError(
      'La cantidad y el mínimo deben ser enteros mayores o iguales a 0',
    );
  }
  // Camino 2: llega o baja del mínimo.
  return cantidad <= minimo;
}

// antes = null -> el repuesto es nuevo (se toma como "no estaba bajo").
// Sirve para escribir STOCK_LOW solo cuando se CRUZA el umbral y no en
// cada edición mientras el repuesto sigue bajo.
export function evaluarCambioStock(
  antes: EstadoStock | null,
  despues: EstadoStock,
): CambioStock {
  const estabaBajo = antes ? esStockBajo(antes.cantidad, antes.minimo) : false;
  const quedaBajo = esStockBajo(despues.cantidad, despues.minimo);

  if (!estabaBajo && quedaBajo) return 'ENTRA_EN_BAJO';
  if (estabaBajo && quedaBajo) return 'SIGUE_BAJO';
  if (estabaBajo && !quedaBajo) return 'SALE_DE_BAJO';
  return 'NORMAL';
}

// ---------- Cantidad de una entrada de inventario ----------

export type MotivoCantidadInvalida = 'VACIO' | 'NO_ENTERO' | 'MENOR_A_UNO';

export type ResultadoCantidad =
  | { valido: true; cantidad: number }
  | { valido: false; motivo: MotivoCantidadInvalida; mensaje: string };

export const MENSAJES_CANTIDAD: Record<MotivoCantidadInvalida, string> = {
  VACIO: 'La cantidad es obligatoria',
  NO_ENTERO: 'La cantidad debe ser un número entero',
  MENOR_A_UNO: 'La cantidad debe ser 1 o mayor',
};

// Una entrada siempre suma: entero de 1 en adelante.
export function validarCantidadEntrada(valor: unknown): ResultadoCantidad {
  // Camino 1: no llegó nada.
  if (valor === undefined || valor === null || valor === '') {
    return invalida('VACIO');
  }
  // Camino 2: texto, decimal, NaN...
  if (typeof valor !== 'number' || !Number.isInteger(valor)) {
    return invalida('NO_ENTERO');
  }
  // Camino 3: cero o negativo.
  if (valor < 1) {
    return invalida('MENOR_A_UNO');
  }
  // Camino 4: válida.
  return { valido: true, cantidad: valor };
}

function invalida(motivo: MotivoCantidadInvalida): ResultadoCantidad {
  return { valido: false, motivo, mensaje: MENSAJES_CANTIDAD[motivo] };
}
