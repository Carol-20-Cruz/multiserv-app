import { EstadoOrden } from '../../generated/prisma/enums';

// Cotización aprobada — funciones puras (sin base de datos).
//
// SWR-PAY-004 necesita un "total cotizado". El MVP guarda un registro mínimo
// en la orden (AJ-09): diagnóstico + valorCotizado + aprobadaEn, sin la tabla
// Cotizacion ni sus ítems. Es un paso propio mientras la orden está en
// EN_DIAGNOSTICO, antes del abono y del paso a reparación.
// Respuesta de la dueña: el valor se corrige SOLO mientras no haya pagos.

// Tope para no desbordar la columna Int de PostgreSQL (2.147.483.647) al
// sumar; además atrapa ceros de más escritos por error.
export const VALOR_COTIZADO_MAXIMO = 999_999_999;

// ---------- ¿Se puede registrar o corregir la cotización? ----------

export type MotivoCotizacionRechazada = 'ESTADO_NO_PERMITE' | 'TIENE_PAGOS';

export type ResultadoCotizacion =
  | { permitido: true }
  | { permitido: false; motivo: MotivoCotizacionRechazada; mensaje: string };

export const MENSAJES_COTIZACION: Record<MotivoCotizacionRechazada, string> = {
  ESTADO_NO_PERMITE:
    'La cotización solo se registra o corrige mientras la orden está en diagnóstico',
  TIENE_PAGOS: 'La orden ya tiene pagos: el valor cotizado quedó fijo',
};

export function evaluarCotizacion(
  estado: EstadoOrden,
  cantidadPagos: number,
): ResultadoCotizacion {
  // Camino 1: dato imposible. Error de programación.
  if (!Number.isInteger(cantidadPagos) || cantidadPagos < 0) {
    throw new RangeError('La cantidad de pagos debe ser un entero de 0 o más');
  }
  // Camino 2: solo en EN_DIAGNOSTICO.
  if (estado !== EstadoOrden.EN_DIAGNOSTICO) {
    return rechazo('ESTADO_NO_PERMITE');
  }
  // Camino 3: con un pago o más, el valor queda fijo.
  if (cantidadPagos > 0) {
    return rechazo('TIENE_PAGOS');
  }
  // Camino 4: se puede.
  return { permitido: true };
}

function rechazo(motivo: MotivoCotizacionRechazada): ResultadoCotizacion {
  return { permitido: false, motivo, mensaje: MENSAJES_COTIZACION[motivo] };
}

// ---------- Valor cotizado (lo usa el DTO) ----------

export type MotivoValorInvalido =
  'VACIO' | 'NO_ENTERO' | 'MENOR_A_UNO' | 'MAYOR_AL_TOPE';

export type ResultadoValor =
  | { valido: true; valor: number }
  | { valido: false; motivo: MotivoValorInvalido; mensaje: string };

export const MENSAJES_VALOR: Record<MotivoValorInvalido, string> = {
  VACIO: 'El valor cotizado es obligatorio',
  NO_ENTERO: 'El valor cotizado debe ser un valor entero en pesos',
  MENOR_A_UNO: 'El valor cotizado debe ser mayor que 0',
  MAYOR_AL_TOPE: 'El valor cotizado no puede superar $ 999.999.999',
};

// SWR-CON-003: pesos enteros, de 1 a 999.999.999.
export function validarValorCotizado(valor: unknown): ResultadoValor {
  // Camino 1: no llegó nada.
  if (valor === undefined || valor === null || valor === '') {
    return invalido('VACIO');
  }
  // Camino 2: texto, decimal, NaN...
  if (typeof valor !== 'number' || !Number.isInteger(valor)) {
    return invalido('NO_ENTERO');
  }
  // Camino 3: cero o negativo.
  if (valor < 1) {
    return invalido('MENOR_A_UNO');
  }
  // Camino 4: por encima del tope.
  if (valor > VALOR_COTIZADO_MAXIMO) {
    return invalido('MAYOR_AL_TOPE');
  }
  // Camino 5: válido.
  return { valido: true, valor };
}

function invalido(motivo: MotivoValorInvalido): ResultadoValor {
  return { valido: false, motivo, mensaje: MENSAJES_VALOR[motivo] };
}
