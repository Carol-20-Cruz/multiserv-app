import { EstadoOrden } from '../../generated/prisma/enums';
import { abonoMinimo } from './abono';

// Transiciones de estado de la orden — funciones puras (sin base de datos).
//
// SWR-ORD-011: los estados cambian SOLO en secuencia.
// AJ-07: en el MVP no hay excepciones (SWR-COT-008 queda para después): no
// se salta, no se retrocede y una orden entregada ya no cambia.
// AJ-09 / AJ-10: para pasar a EN_REPARACION hace falta la cotización
// aprobada y el abono mínimo (≥ techo del % del valor cotizado).
// ENTREGADO no se alcanza por aquí: tiene su propia ruta (/entregar), que
// exige saldo en cero (SWR-ENT-003, Entrega B).

export const SECUENCIA_ESTADOS = [
  EstadoOrden.RECIBIDO,
  EstadoOrden.EN_DIAGNOSTICO,
  EstadoOrden.EN_REPARACION,
  EstadoOrden.LISTO_PARA_ENTREGA,
  EstadoOrden.ENTREGADO,
] as const;

export const ETIQUETA_ESTADO: Record<EstadoOrden, string> = {
  RECIBIDO: 'Recibido',
  EN_DIAGNOSTICO: 'En diagnóstico',
  EN_REPARACION: 'En reparación',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  ENTREGADO: 'Entregado',
};

// El que sigue en la secuencia (null en ENTREGADO).
export function siguienteEstado(estado: EstadoOrden): EstadoOrden | null {
  const indice = SECUENCIA_ESTADOS.indexOf(estado);
  return SECUENCIA_ESTADOS[indice + 1] ?? null;
}

// El siguiente que se alcanza con "cambiar estado" (sin la entrega).
export function siguientePorCambioDeEstado(
  estado: EstadoOrden,
): EstadoOrden | null {
  const siguiente = siguienteEstado(estado);
  return siguiente === EstadoOrden.ENTREGADO ? null : siguiente;
}

export type MotivoTransicionRechazada =
  | 'YA_ENTREGADO'
  | 'MISMO_ESTADO'
  | 'RETROCESO'
  | 'SALTO'
  | 'ENTREGA_POR_OTRA_RUTA'
  | 'FALTA_VALOR_COTIZADO'
  | 'FALTA_ABONO';

export interface ContextoTransicion {
  valorCotizado: number | null;
  totalPagado: number;
  porcentajeAbono: number;
}

export type ResultadoTransicion =
  | { permitido: true }
  | {
      permitido: false;
      motivo: Exclude<MotivoTransicionRechazada, 'FALTA_ABONO'>;
      mensaje: string;
    }
  | {
      permitido: false;
      motivo: 'FALTA_ABONO';
      mensaje: string;
      abonoMinimo: number;
      totalPagado: number;
    };

export const MENSAJES_TRANSICION: Record<
  Exclude<MotivoTransicionRechazada, 'SALTO'>,
  string
> = {
  YA_ENTREGADO: 'La orden ya fue entregada; su estado no cambia',
  MISMO_ESTADO: 'La orden ya está en ese estado',
  RETROCESO: 'No se puede devolver la orden a un estado anterior',
  ENTREGA_POR_OTRA_RUTA:
    'La entrega se registra con "Entregar equipo", que exige el saldo en cero',
  FALTA_VALOR_COTIZADO:
    'Falta registrar la cotización aprobada para pasar a reparación',
  FALTA_ABONO: 'Falta el abono mínimo para pasar a reparación',
};

// Mensaje del salto: dice cuál es el paso que sí se puede dar.
export const mensajeSalto = (actual: EstadoOrden) => {
  const siguiente = siguienteEstado(actual);
  return `Los estados van en orden: el siguiente es «${ETIQUETA_ESTADO[siguiente ?? actual]}»`;
};

export function evaluarTransicion(
  actual: EstadoOrden,
  nuevo: EstadoOrden,
  ctx: ContextoTransicion,
): ResultadoTransicion {
  // Camino 1: dato imposible. Error de programación.
  if (!Number.isInteger(ctx.totalPagado) || ctx.totalPagado < 0) {
    throw new RangeError('El total pagado debe ser un entero de 0 o más');
  }

  const desde = SECUENCIA_ESTADOS.indexOf(actual);
  const hacia = SECUENCIA_ESTADOS.indexOf(nuevo);

  // Camino 2: una orden entregada ya no cambia (AJ-07).
  if (actual === EstadoOrden.ENTREGADO) return rechazo('YA_ENTREGADO');
  // Camino 3: pedir el mismo estado (p. ej., doble clic).
  if (hacia === desde) return rechazo('MISMO_ESTADO');
  // Camino 4: volver atrás (AJ-07).
  if (hacia < desde) return rechazo('RETROCESO');
  // Camino 5: saltarse uno o más estados (SWR-ORD-011).
  if (hacia > desde + 1) {
    return { permitido: false, motivo: 'SALTO', mensaje: mensajeSalto(actual) };
  }
  // Camino 6: el siguiente es ENTREGADO -> por /entregar (SWR-ENT-003).
  if (nuevo === EstadoOrden.ENTREGADO) {
    return rechazo('ENTREGA_POR_OTRA_RUTA');
  }

  if (nuevo === EstadoOrden.EN_REPARACION) {
    // Camino 7: sin cotización aprobada no hay reparación (AJ-09).
    if (ctx.valorCotizado === null) return rechazo('FALTA_VALOR_COTIZADO');
    // Camino 8: sin el abono mínimo no hay reparación (AJ-10).
    const minimo = abonoMinimo(ctx.valorCotizado, ctx.porcentajeAbono);
    if (ctx.totalPagado < minimo) {
      return {
        permitido: false,
        motivo: 'FALTA_ABONO',
        mensaje: MENSAJES_TRANSICION.FALTA_ABONO,
        abonoMinimo: minimo,
        totalPagado: ctx.totalPagado,
      };
    }
  }

  // Camino 9: paso permitido.
  return { permitido: true };
}

function rechazo(
  motivo: Exclude<MotivoTransicionRechazada, 'SALTO' | 'FALTA_ABONO'>,
): ResultadoTransicion {
  return { permitido: false, motivo, mensaje: MENSAJES_TRANSICION[motivo] };
}
