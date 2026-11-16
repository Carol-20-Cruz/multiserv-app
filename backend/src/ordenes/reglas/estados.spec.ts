import { EstadoOrden } from '../../generated/prisma/enums';
import {
  MENSAJES_TRANSICION,
  SECUENCIA_ESTADOS,
  evaluarTransicion,
  mensajeSalto,
  siguienteEstado,
  siguientePorCambioDeEstado,
  type ContextoTransicion,
} from './estados';

const {
  RECIBIDO,
  EN_DIAGNOSTICO,
  EN_REPARACION,
  LISTO_PARA_ENTREGA,
  ENTREGADO,
} = EstadoOrden;

// Contexto que cumple todo (cotización aprobada y abono completo), para
// probar solo la secuencia.
const CTX_COMPLETO: ContextoTransicion = {
  valorCotizado: 180000,
  totalPagado: 90000,
  porcentajeAbono: 50,
};

describe('Reglas de transiciones de estado', () => {
  // ---------- SWR-ORD-011 + AJ-07: tabla completa 5 × 5 ----------

  // Por "cambiar estado" solo hay 3 pasos permitidos; el cuarto
  // (LISTO -> ENTREGADO) va por /entregar.
  const PERMITIDOS = new Set([
    `${RECIBIDO}->${EN_DIAGNOSTICO}`,
    `${EN_DIAGNOSTICO}->${EN_REPARACION}`,
    `${EN_REPARACION}->${LISTO_PARA_ENTREGA}`,
  ]);
  const pares = SECUENCIA_ESTADOS.flatMap((actual) =>
    SECUENCIA_ESTADOS.map((nuevo) => [actual, nuevo] as const),
  );

  it.each(pares)('%s -> %s', (actual, nuevo) => {
    // Act
    const resultado = evaluarTransicion(actual, nuevo, CTX_COMPLETO);

    // Assert
    expect(resultado.permitido).toBe(PERMITIDOS.has(`${actual}->${nuevo}`));
  });

  // ---------- Un caso por camino (caja blanca) ----------

  // Camino 2: una orden entregada no cambia, ni siquiera "al mismo estado".
  it('ENTREGADO -> ENTREGADO: YA_ENTREGADO (antes que MISMO_ESTADO)', () => {
    // Act
    const resultado = evaluarTransicion(ENTREGADO, ENTREGADO, CTX_COMPLETO);

    // Assert
    expect(resultado).toEqual({
      permitido: false,
      motivo: 'YA_ENTREGADO',
      mensaje: MENSAJES_TRANSICION.YA_ENTREGADO,
    });
  });

  // Camino 3: doble clic que pide el estado en el que ya está.
  it('EN_DIAGNOSTICO -> EN_DIAGNOSTICO: MISMO_ESTADO', () => {
    // Act
    const resultado = evaluarTransicion(
      EN_DIAGNOSTICO,
      EN_DIAGNOSTICO,
      CTX_COMPLETO,
    );

    // Assert
    expect(resultado).toMatchObject({ motivo: 'MISMO_ESTADO' });
  });

  // Camino 4 (AJ-07): no se retrocede.
  it('EN_REPARACION -> EN_DIAGNOSTICO: RETROCESO', () => {
    // Act
    const resultado = evaluarTransicion(
      EN_REPARACION,
      EN_DIAGNOSTICO,
      CTX_COMPLETO,
    );

    // Assert
    expect(resultado).toEqual({
      permitido: false,
      motivo: 'RETROCESO',
      mensaje: MENSAJES_TRANSICION.RETROCESO,
    });
  });

  // Camino 5 (SWR-ORD-011): saltarse un estado; el mensaje dice cuál sigue.
  it('RECIBIDO -> EN_REPARACION: SALTO con el siguiente en el mensaje', () => {
    // Act
    const resultado = evaluarTransicion(RECIBIDO, EN_REPARACION, CTX_COMPLETO);

    // Assert
    expect(resultado).toEqual({
      permitido: false,
      motivo: 'SALTO',
      mensaje: 'Los estados van en orden: el siguiente es «En diagnóstico»',
    });
  });

  // Camino 6 (SWR-ENT-003): la entrega no va por "cambiar estado".
  it('LISTO_PARA_ENTREGA -> ENTREGADO: ENTREGA_POR_OTRA_RUTA', () => {
    // Act
    const resultado = evaluarTransicion(
      LISTO_PARA_ENTREGA,
      ENTREGADO,
      CTX_COMPLETO,
    );

    // Assert
    expect(resultado).toMatchObject({ motivo: 'ENTREGA_POR_OTRA_RUTA' });
  });

  // Camino 7 (AJ-09): sin cotización, aunque ya haya pagos.
  it('a reparación sin valor cotizado: FALTA_VALOR_COTIZADO', () => {
    // Arrange
    const ctx = {
      valorCotizado: null,
      totalPagado: 50000,
      porcentajeAbono: 50,
    };

    // Act
    const resultado = evaluarTransicion(EN_DIAGNOSTICO, EN_REPARACION, ctx);

    // Assert
    expect(resultado).toEqual({
      permitido: false,
      motivo: 'FALTA_VALOR_COTIZADO',
      mensaje: MENSAJES_TRANSICION.FALTA_VALOR_COTIZADO,
    });
  });

  // Camino 8 (AJ-10, frontera): valor 180.001 -> mínimo 90.001; con 90.000 no.
  it('a reparación con 90000 pagados de 90001 mínimos: FALTA_ABONO', () => {
    // Arrange
    const ctx = {
      valorCotizado: 180001,
      totalPagado: 90000,
      porcentajeAbono: 50,
    };

    // Act
    const resultado = evaluarTransicion(EN_DIAGNOSTICO, EN_REPARACION, ctx);

    // Assert
    expect(resultado).toEqual({
      permitido: false,
      motivo: 'FALTA_ABONO',
      mensaje: MENSAJES_TRANSICION.FALTA_ABONO,
      abonoMinimo: 90001,
      totalPagado: 90000,
    });
  });

  // Camino 8 (AJ-10): sin ningún pago (es lo que pasa en la Entrega A).
  it('a reparación con cotización y 0 pagado: FALTA_ABONO', () => {
    // Arrange
    const ctx = { valorCotizado: 180000, totalPagado: 0, porcentajeAbono: 50 };

    // Act
    const resultado = evaluarTransicion(EN_DIAGNOSTICO, EN_REPARACION, ctx);

    // Assert
    expect(resultado).toMatchObject({
      motivo: 'FALTA_ABONO',
      abonoMinimo: 90000,
    });
  });

  // Camino 9 (AJ-10, frontera): exactamente el mínimo ya alcanza.
  it('a reparación con 90001 pagados de 90001 mínimos: permitido', () => {
    // Arrange
    const ctx = {
      valorCotizado: 180001,
      totalPagado: 90001,
      porcentajeAbono: 50,
    };

    // Act
    const resultado = evaluarTransicion(EN_DIAGNOSTICO, EN_REPARACION, ctx);

    // Assert
    expect(resultado).toEqual({ permitido: true });
  });

  // Camino 9: los demás pasos no miran la cotización ni los pagos.
  it('RECIBIDO -> EN_DIAGNOSTICO sin cotización ni pagos: permitido', () => {
    // Arrange
    const ctx = { valorCotizado: null, totalPagado: 0, porcentajeAbono: 50 };

    // Act
    const resultado = evaluarTransicion(RECIBIDO, EN_DIAGNOSTICO, ctx);

    // Assert
    expect(resultado).toEqual({ permitido: true });
  });

  // Caja blanca, camino 1: total pagado imposible.
  it.each([-1, 10.5, Number.NaN])(
    'total pagado %p: lanza RangeError',
    (totalPagado) => {
      // Arrange
      const evaluar = () =>
        evaluarTransicion(RECIBIDO, EN_DIAGNOSTICO, {
          ...CTX_COMPLETO,
          totalPagado,
        });

      // Act + Assert
      expect(evaluar).toThrow(RangeError);
    },
  );

  // ---------- Auxiliares de la secuencia ----------

  it.each([
    [RECIBIDO, EN_DIAGNOSTICO],
    [EN_DIAGNOSTICO, EN_REPARACION],
    [EN_REPARACION, LISTO_PARA_ENTREGA],
    [LISTO_PARA_ENTREGA, ENTREGADO],
    [ENTREGADO, null],
  ])('siguienteEstado(%s) = %s', (estado, esperado) => {
    // Act + Assert
    expect(siguienteEstado(estado)).toBe(esperado);
  });

  // LISTO no ofrece "cambiar estado": la entrega va por otra ruta.
  it.each([
    [EN_REPARACION, LISTO_PARA_ENTREGA],
    [LISTO_PARA_ENTREGA, null],
    [ENTREGADO, null],
  ])('siguientePorCambioDeEstado(%s) = %s', (estado, esperado) => {
    // Act + Assert
    expect(siguientePorCambioDeEstado(estado)).toBe(esperado);
  });

  it('mensajeSalto desde EN_REPARACION nombra «Listo para entrega»', () => {
    // Act + Assert
    expect(mensajeSalto(EN_REPARACION)).toBe(
      'Los estados van en orden: el siguiente es «Listo para entrega»',
    );
  });
});
