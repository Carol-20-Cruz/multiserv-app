import { EstadoOrden, TipoPago } from '../../generated/prisma/enums';

// Saldo, pagos y entrega — funciones puras (sin base de datos).
//
// SWR-PAY-004: los pagos (abonos y saldo) se descuentan del valor cotizado
// (AJ-09) y nunca lo superan. SWR-ENT-003: la orden solo se entrega con
// saldo 0 y en LISTO_PARA_ENTREGA. Pesos enteros (SWR-CON-003).

const esEntero = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n);

// ---------- Saldo ----------

// null: la orden aún no tiene cotización, así que no hay saldo que cobrar.
export function calcularSaldo(
  valorCotizado: number | null,
  pagos: readonly number[],
): number | null {
  // Camino 1: algún pago imposible (negativo, decimal). Error de programación.
  if (pagos.some((p) => !esEntero(p) || p < 0)) {
    throw new RangeError('Cada pago debe ser un entero de 0 o más');
  }
  const pagado = pagos.reduce((suma, p) => suma + p, 0);
  // Camino 2: sin cotización. Solo es válido si no hay nada pagado.
  if (valorCotizado === null) {
    if (pagado > 0) {
      throw new RangeError('Hay pagos sin valor cotizado');
    }
    return null;
  }
  // Camino 3: valor cotizado imposible.
  if (!esEntero(valorCotizado) || valorCotizado < 1) {
    throw new RangeError('El valor cotizado debe ser un entero de 1 o más');
  }
  // Camino 4: se pagó más que el total. Nunca debería pasar.
  if (pagado > valorCotizado) {
    throw new RangeError('Los pagos superan el valor cotizado');
  }
  // Camino 5: lo que falta.
  return valorCotizado - pagado;
}

// ---------- ¿Se puede registrar este pago? ----------

export type MotivoPagoRechazado =
  | 'VACIO'
  | 'NO_ENTERO'
  | 'MENOR_A_UNO'
  | 'ORDEN_ENTREGADA'
  | 'SIN_VALOR_COTIZADO'
  | 'SUPERA_SALDO';

export type ResultadoPago =
  | { valido: true; valor: number; saldo: number; saldoResultante: number }
  | { valido: false; motivo: MotivoPagoRechazado; mensaje: string };

export const MENSAJES_PAGO: Record<MotivoPagoRechazado, string> = {
  VACIO: 'El valor del pago es obligatorio',
  NO_ENTERO: 'El valor del pago debe ser un valor entero en pesos',
  MENOR_A_UNO: 'El valor del pago debe ser mayor que 0',
  ORDEN_ENTREGADA: 'La orden ya fue entregada: no recibe más pagos',
  SIN_VALOR_COTIZADO:
    'La orden no tiene cotización aprobada: aún no hay valor que cobrar',
  SUPERA_SALDO: 'El pago no puede superar el saldo pendiente',
};

export interface OrdenParaPago {
  estado: EstadoOrden;
  valorCotizado: number | null;
  pagos: readonly number[];
}

// Orden de revisión (acordado con la dueña): primero el valor, luego la
// orden y al final el saldo. Así una orden entregada con saldo 0 responde
// ORDEN_ENTREGADA y no SUPERA_SALDO.
export function validarPago(
  valor: unknown,
  orden: OrdenParaPago,
): ResultadoPago {
  // Camino 1: no llegó nada.
  if (valor === undefined || valor === null || valor === '') {
    return rechazo('VACIO');
  }
  // Camino 2: texto, decimal, NaN...
  if (!esEntero(valor)) {
    return rechazo('NO_ENTERO');
  }
  // Camino 3: cero o negativo.
  if (valor < 1) {
    return rechazo('MENOR_A_UNO');
  }
  // Camino 4: la orden ya salió del taller.
  if (orden.estado === EstadoOrden.ENTREGADO) {
    return rechazo('ORDEN_ENTREGADA');
  }
  // Camino 5: sin cotización (incluye toda orden en RECIBIDO).
  const saldo = calcularSaldo(orden.valorCotizado, orden.pagos);
  if (saldo === null) {
    return rechazo('SIN_VALOR_COTIZADO');
  }
  // Camino 6: más que el saldo. Pagar exactamente el saldo es válido.
  if (valor > saldo) {
    return rechazo('SUPERA_SALDO');
  }
  // Camino 7: válido.
  return { valido: true, valor, saldo, saldoResultante: saldo - valor };
}

function rechazo(motivo: MotivoPagoRechazado): ResultadoPago {
  return { valido: false, motivo, mensaje: MENSAJES_PAGO[motivo] };
}

// ---------- Tipo del pago (no lo elige el usuario) ----------

export function tipoPago(valor: number, saldo: number): TipoPago {
  // Camino 1: datos imposibles. validarPago ya los descarta antes.
  if (!esEntero(valor) || valor < 1 || !esEntero(saldo) || valor > saldo) {
    throw new RangeError('El pago debe ser un entero de 1 hasta el saldo');
  }
  // Camino 2: cubre todo lo que falta -> SALDO; si no, ABONO.
  return valor === saldo ? TipoPago.SALDO : TipoPago.ABONO;
}

// ---------- ¿Se puede entregar? ----------

export function puedeEntregar(
  estado: EstadoOrden,
  saldo: number | null,
): boolean {
  // Camino 1: solo desde LISTO_PARA_ENTREGA.
  if (estado !== EstadoOrden.LISTO_PARA_ENTREGA) return false;
  // Camino 2: solo con saldo exactamente 0 (null = sin cotización = no).
  return saldo === 0;
}

// ---------- Vencimiento de la garantía ----------

// Colombia no tiene horario de verano: siempre UTC−5.
const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

// La garantía vence al FINAL del día (23:59:59.999 hora de Colombia) de
// fechaEntrega + diasGarantia, contando días de calendario en Colombia.
export function vencimientoGarantia(
  fechaEntrega: Date,
  diasGarantia: number,
): Date {
  // Camino 1: datos imposibles.
  if (Number.isNaN(fechaEntrega.getTime())) {
    throw new RangeError('La fecha de entrega no es válida');
  }
  if (!esEntero(diasGarantia) || diasGarantia < 0) {
    throw new RangeError('Los días de garantía deben ser un entero de 0 o más');
  }
  // Camino 2: día de calendario en Colombia -> sumar días -> fin de ese día.
  const local = new Date(fechaEntrega.getTime() - DESFASE_COLOMBIA_MS);
  const inicioDiaLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  const finDiaLocal = inicioDiaLocal + (diasGarantia + 1) * DIA_MS - 1;
  return new Date(finDiaLocal + DESFASE_COLOMBIA_MS);
}
